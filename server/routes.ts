import crypto from 'crypto';
import {Router} from 'express';
import type {Response} from 'express';
import type {
  BusinessRole,
  IntermediaryDisclosure,
  LandedCostInput,
  ListingStatus,
  ListingType,
  MarketplaceCorridor,
  MarketplaceListing,
  ParticipantCategory,
  QuotationStatus,
  SellerDisclosureRole,
  TradeDeskStage,
  VerificationLevel,
} from '../src/types/terraexchange.js';
import {
  createAuthMiddleware,
  hashPassword,
  issueSessionToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth.js';
import {db} from './store.js';

export function createApiRouter() {
  const router = Router();
  const auth = createAuthMiddleware((id) => db.users.find((u) => u.id === id));

  router.use(auth.optionalAuth);

  // 1. Health & API Index
  router.get('/health', (_req, res) => {
    res.json({
      service: 'terraexchange-api',
      version: 'v1',
      status: 'operational',
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Authentication & Business Registration
  router.get('/auth/demo-accounts', (_req, res) => {
    const accounts = db.users
      .filter((u) => u.isDemo)
      .map((u) => {
        const biz = db.businesses.find((b) => b.id === u.businessId);
        return {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          businessRole: u.businessRole,
          businessName: biz?.name || 'Commercial Account',
          country: biz?.country || '',
          verificationLevel: biz?.verificationLevel || 1,
          isPlatformAdmin: Boolean(u.isPlatformAdmin),
          isTradeDeskStaff: Boolean(u.isTradeDeskStaff),
        };
      });
    res.json({accounts});
  });

  router.post('/auth/demo-login', (req, res: Response) => {
    const {userId} = req.body as {userId?: string};
    const user = db.users.find((u) => u.id === userId && u.isDemo);
    if (!user) {
      res.status(404).json({error: 'Demo workspace account not found.'});
      return;
    }
    const business = db.businesses.find((b) => b.id === user.businessId);
    const token = issueSessionToken(user);
    res.json({
      token,
      user: db.getPublicUser(user),
      business,
    });
  });

  router.post('/auth/login', (req, res: Response) => {
    const {email, password} = req.body as {email?: string; password?: string};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({error: 'Business email and password are required.'});
      return;
    }
    const normalized = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalized);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({error: 'Invalid email or password.'});
      return;
    }
    const business = db.businesses.find((b) => b.id === user.businessId);
    const token = issueSessionToken(user);
    res.json({
      token,
      user: db.getPublicUser(user),
      business,
    });
  });

  router.post('/auth/register', (req, res: Response) => {
    const body = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      country?: string;
      city?: string;
      businessName?: string;
      registrationNumber?: string;
      website?: string;
      address?: string;
      industry?: string;
      businessRole?: BusinessRole;
      participantCategories?: ParticipantCategory[];
      corridors?: MarketplaceCorridor[];
    };

    if (
      !body.fullName?.trim() ||
      !body.email?.trim() ||
      !body.password ||
      body.password.length < 8 ||
      !body.businessName?.trim() ||
      !body.country?.trim()
    ) {
      res.status(400).json({
        error:
          'Full name, business email, password (min 8 chars), country, and business name are required.',
      });
      return;
    }

    const emailLower = body.email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === emailLower)) {
      res.status(409).json({error: 'An account with this business email already exists.'});
      return;
    }

    const bizId = `biz_${crypto.randomUUID().slice(0, 8)}`;
    const userId = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newBiz = {
      id: bizId,
      name: body.businessName.trim(),
      country: body.country.trim(),
      city: body.city?.trim() || 'Head Office',
      registrationNumber: body.registrationNumber?.trim() || 'Pending Submission',
      website: body.website?.trim() || '',
      address: body.address?.trim() || '',
      industry: body.industry?.trim() || 'General Commodities & Trade',
      participantCategories:
        Array.isArray(body.participantCategories) && body.participantCategories.length > 0
          ? body.participantCategories
          : (['industrial_buyer'] as ParticipantCategory[]),
      verificationLevel: (body.registrationNumber?.trim() ? 2 : 1) as VerificationLevel,
      verificationSummary: body.registrationNumber?.trim()
        ? 'Business registration details submitted; pending compliance review.'
        : 'Registered commercial account. Submit registration documents to advance verification.',
      corridors:
        Array.isArray(body.corridors) && body.corridors.length > 0
          ? body.corridors
          : (['SA', 'GLOBAL'] as MarketplaceCorridor[]),
      documents: [],
      isDemo: false,
      createdAt: now,
    };

    const allowedSelfRoles: BusinessRole[] = [
      'business_owner',
      'administrator',
      'procurement_manager',
      'sales_representative',
      'trading_manager',
      'finance_officer',
      'operations_manager',
    ];
    const requestedRole = allowedSelfRoles.includes(body.businessRole as BusinessRole)
      ? (body.businessRole as BusinessRole)
      : 'business_owner';

    const newUser = {
      id: userId,
      fullName: body.fullName.trim(),
      email: emailLower,
      phone: body.phone?.trim() || '',
      businessId: bizId,
      businessRole: requestedRole,
      isPlatformAdmin: false,
      isTradeDeskStaff: false,
      isDemo: false,
      createdAt: now,
      passwordHash: hashPassword(body.password),
    };

    db.businesses.unshift(newBiz);
    db.users.push(newUser);
    db.addAudit({
      actorUserId: userId,
      actorName: newUser.fullName,
      actorBusinessId: bizId,
      action: 'BUSINESS_REGISTERED',
      entityType: 'business',
      entityId: bizId,
      summary: `Registered commercial account for ${newBiz.name} (${newBiz.country}).`,
    });

    const token = issueSessionToken(newUser);
    res.status(201).json({
      token,
      user: db.getPublicUser(newUser),
      business: newBiz,
    });
  });

  router.get('/auth/me', auth.requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const business = db.businesses.find((b) => b.id === user.businessId);
    res.json({user, business});
  });

  // 3. Commodity Catalogue
  router.get('/commodities', (_req, res) => {
    const items = db.commodities.map((c) => ({
      ...c,
      activeSupplyCount: db.listings.filter(
        (l) => l.commoditySlug === c.slug && l.type === 'supply' && l.status === 'active'
      ).length,
      activeDemandCount: db.listings.filter(
        (l) => l.commoditySlug === c.slug && l.type === 'demand' && l.status === 'active'
      ).length,
    }));
    res.json({commodities: items});
  });

  router.get('/commodities/:slug', (req, res) => {
    const commodity = db.commodities.find((c) => c.slug === req.params.slug);
    if (!commodity) {
      res.status(404).json({error: 'Commodity template not found.'});
      return;
    }
    const relatedListings = db.listings.filter(
      (l) => l.commoditySlug === commodity.slug && l.status === 'active'
    );
    res.json({commodity, relatedListings});
  });

  // 4. Businesses (Buyers, Suppliers, Intermediaries)
  router.get('/businesses', (req: AuthenticatedRequest, res: Response) => {
    const {role, corridor, country, minVerification, q} = req.query as Record<string, string>;
    let list = db.businesses.filter((b) => b.id !== 'biz_terra_ops');

    if (role === 'buyer') {
      list = list.filter((b) =>
        b.participantCategories.some((c) =>
          ['industrial_buyer', 'importer_wholesaler', 'processor_smelter'].includes(c)
        )
      );
    } else if (role === 'supplier') {
      list = list.filter((b) =>
        b.participantCategories.some((c) =>
          [
            'mine_producer',
            'agricultural_producer',
            'manufacturer_exporter',
            'commodity_supplier',
            'processor_smelter',
          ].includes(c)
        )
      );
    }
    if (corridor && corridor !== 'ALL') {
      list = list.filter((b) => b.corridors.includes(corridor as MarketplaceCorridor));
    }
    if (country && country !== 'ALL') {
      list = list.filter((b) => b.country.toLowerCase() === country.toLowerCase());
    }
    if (minVerification) {
      const minV = Number(minVerification);
      if (!Number.isNaN(minV)) list = list.filter((b) => b.verificationLevel >= minV);
    }
    if (q) {
      const query = q.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.industry.toLowerCase().includes(query) ||
          b.city.toLowerCase().includes(query)
      );
    }

    res.json({
      businesses: list.map((b) => db.sanitizeBusinessForViewer(b, req.authUser)),
    });
  });

  router.get('/businesses/:id', (req: AuthenticatedRequest, res: Response) => {
    const biz = db.businesses.find((b) => b.id === req.params.id);
    if (!biz) {
      res.status(404).json({error: 'Business profile not found.'});
      return;
    }
    const listings = db.listings.filter(
      (l) => l.businessId === biz.id && (l.status === 'active' || req.authUser?.businessId === biz.id)
    );
    res.json({
      business: db.sanitizeBusinessForViewer(biz, req.authUser),
      listings,
    });
  });

  router.post(
    '/businesses/:id/documents',
    auth.requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      const biz = db.businesses.find((b) => b.id === req.params.id);
      if (!biz) {
        res.status(404).json({error: 'Business not found.'});
        return;
      }
      if (biz.id !== user.businessId && !user.isPlatformAdmin) {
        res.status(403).json({error: 'You may only submit documents for your own business.'});
        return;
      }
      const {type, title, referenceNumber} = req.body as {
        type?: string;
        title?: string;
        referenceNumber?: string;
      };
      if (!type || !title?.trim() || !referenceNumber?.trim()) {
        res.status(400).json({error: 'Document type, title, and reference number are required.'});
        return;
      }
      const doc = {
        id: `doc_${crypto.randomUUID().slice(0, 8)}`,
        type: type as NonNullable<typeof biz.documents[number]['type']>,
        title: title.trim(),
        referenceNumber: referenceNumber.trim(),
        status: 'submitted' as const,
        submittedAt: new Date().toISOString(),
      };
      biz.documents.unshift(doc);
      if (biz.verificationLevel < 2) {
        biz.verificationLevel = 2;
        biz.verificationSummary =
          'Business identity & compliance documents submitted; awaiting review.';
      }
      db.addAudit({
        actorUserId: user.id,
        actorName: user.fullName,
        actorBusinessId: biz.id,
        action: 'VERIFICATION_DOC_SUBMITTED',
        entityType: 'verification',
        entityId: doc.id,
        summary: `${biz.name} submitted "${doc.title}" for verification review.`,
      });
      res.status(201).json({document: doc, business: biz});
    }
  );

  // 5. Marketplace Listings (Supply & Demand)
  router.get('/listings', (req: AuthenticatedRequest, res: Response) => {
    const {
      corridor,
      type,
      category,
      country,
      minVerification,
      commoditySlug,
      q,
      sort,
      mine,
    } = req.query as Record<string, string>;

    let items = [...db.listings];

    if (mine === 'true' && req.authUser) {
      items = items.filter((l) => l.businessId === req.authUser!.businessId);
    } else {
      items = items.filter((l) => l.status === 'active');
    }

    if (corridor && corridor !== 'ALL') {
      items = items.filter((l) => l.corridor === corridor);
    }
    if (type && type !== 'all') {
      items = items.filter((l) => l.type === type);
    }
    if (category && category !== 'ALL') {
      items = items.filter((l) => l.category === category);
    }
    if (commoditySlug && commoditySlug !== 'ALL') {
      items = items.filter((l) => l.commoditySlug === commoditySlug);
    }
    if (country && country !== 'ALL') {
      items = items.filter(
        (l) =>
          l.originCountry.toLowerCase() === country.toLowerCase() ||
          l.businessCountry.toLowerCase() === country.toLowerCase()
      );
    }
    if (minVerification) {
      const minV = Number(minVerification);
      if (!Number.isNaN(minV)) items = items.filter((l) => l.verificationLevel >= minV);
    }
    if (q) {
      const query = q.toLowerCase();
      items = items.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          l.commodityName.toLowerCase().includes(query) ||
          l.businessName.toLowerCase().includes(query) ||
          l.actualLocation.toLowerCase().includes(query)
      );
    }

    if (sort === 'price_asc') {
      items.sort((a, b) => (a.pricePerUnit ?? 9e9) - (b.pricePerUnit ?? 9e9));
    } else if (sort === 'quantity_desc') {
      items.sort((a, b) => b.quantity - a.quantity);
    } else if (sort === 'verification_desc') {
      items.sort((a, b) => b.verificationLevel - a.verificationLevel);
    } else {
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    res.json({listings: items});
  });

  router.get('/listings/:id', (req, res) => {
    const listing = db.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({error: 'Listing not found.'});
      return;
    }
    const commodity = db.commodities.find((c) => c.slug === listing.commoditySlug);
    const business = db.businesses.find((b) => b.id === listing.businessId);
    const recommendedSuppliers =
      listing.type === 'demand'
        ? db.computeMatchesForQuery({
            commoditySlug: listing.commoditySlug,
            corridor: listing.corridor,
            minQuantity: listing.quantity,
          })
        : [];

    res.json({
      listing,
      commodity,
      business: business ? db.sanitizeBusinessForViewer(business) : undefined,
      recommendedSuppliers,
    });
  });

  router.post('/listings', auth.requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const biz = db.businesses.find((b) => b.id === user.businessId);
    if (!biz) {
      res.status(400).json({error: 'Associated business account not found.'});
      return;
    }

    const body = req.body as {
      type: ListingType;
      corridor: MarketplaceCorridor;
      commoditySlug: string;
      title: string;
      description: string;
      specifications: Record<string, string | number>;
      quantity: number;
      unit: string;
      minOrderQuantity: number;
      pricePerUnit: number | null;
      currency: 'USD' | 'ZAR' | 'CNY' | 'EUR';
      originCountry: string;
      actualLocation: string;
      deliveryDestination?: string;
      packaging: string;
      incoterms: string[];
      availableDocuments: string[];
      sellerRole: SellerDisclosureRole;
      intermediaryDisclosure?: IntermediaryDisclosure;
      status?: ListingStatus;
    };

    const commodity = db.commodities.find((c) => c.slug === body.commoditySlug);
    if (!commodity) {
      res.status(400).json({error: 'Invalid commodity selection.'});
      return;
    }
    if (!body.title?.trim() || !body.quantity || body.quantity <= 0) {
      res.status(400).json({error: 'Listing title and valid positive quantity are required.'});
      return;
    }

    // Enforce intermediary disclosure rule
    const isIntermediary =
      body.sellerRole === 'mandated_intermediary' || body.sellerRole === 'broker';
    if (isIntermediary && !body.intermediaryDisclosure?.principalName?.trim()) {
      res.status(400).json({
        error:
          'Intermediaries and brokers must disclose their mandate/principal status before publishing.',
      });
      return;
    }

    const now = new Date().toISOString();
    const newListing: MarketplaceListing = {
      id: `lst_${crypto.randomUUID().slice(0, 8)}`,
      type: body.type === 'demand' ? 'demand' : 'supply',
      corridor: body.corridor || 'SA',
      status: body.status === 'draft' ? 'draft' : 'active',
      businessId: biz.id,
      businessName: biz.name,
      businessCountry: biz.country,
      verificationLevel: biz.verificationLevel,
      commoditySlug: commodity.slug,
      commodityName: commodity.name,
      category: commodity.category,
      title: body.title.trim(),
      description: body.description?.trim() || commodity.description,
      specifications: body.specifications || {},
      quantity: Number(body.quantity),
      unit: body.unit?.trim() || commodity.defaultUnit,
      minOrderQuantity: Number(body.minOrderQuantity) || 1,
      pricePerUnit:
        body.pricePerUnit !== null && body.pricePerUnit !== undefined && Number(body.pricePerUnit) > 0
          ? Number(body.pricePerUnit)
          : null,
      currency: body.currency || 'USD',
      originCountry: body.originCountry?.trim() || biz.country,
      actualLocation: body.actualLocation?.trim() || biz.city,
      deliveryDestination: body.deliveryDestination?.trim(),
      packaging: body.packaging?.trim() || 'Standard Export Packaging',
      incoterms: Array.isArray(body.incoterms) && body.incoterms.length > 0 ? body.incoterms : ['FOB'],
      availableDocuments: Array.isArray(body.availableDocuments) ? body.availableDocuments : [],
      sellerRole: body.sellerRole || 'stockist_supplier',
      intermediaryDisclosure: isIntermediary
        ? {
            isIntermediary: true,
            principalName: body.intermediaryDisclosure?.principalName?.trim(),
            holdsValidMandate: Boolean(body.intermediaryDisclosure?.holdsValidMandate),
            feeStructure: body.intermediaryDisclosure?.feeStructure?.trim(),
            negotiationAuthority: body.intermediaryDisclosure?.negotiationAuthority || 'introduction_only',
          }
        : {isIntermediary: false},
      imageUrl: commodity.imageUrl,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    db.listings.unshift(newListing);
    db.addAudit({
      actorUserId: user.id,
      actorName: user.fullName,
      actorBusinessId: biz.id,
      action: 'LISTING_CREATED',
      entityType: 'listing',
      entityId: newListing.id,
      summary: `Created ${newListing.type} listing "${newListing.title}" (${newListing.quantity} ${newListing.unit}).`,
    });

    res.status(201).json({listing: newListing});
  });

  router.patch('/listings/:id', auth.requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const listing = db.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({error: 'Listing not found.'});
      return;
    }
    if (listing.businessId !== user.businessId && !user.isPlatformAdmin) {
      res.status(403).json({error: 'Only the owning business or an administrator can update this listing.'});
      return;
    }
    const {status, pricePerUnit, quantity} = req.body as {
      status?: ListingStatus;
      pricePerUnit?: number | null;
      quantity?: number;
    };
    if (status) listing.status = status;
    if (pricePerUnit !== undefined) listing.pricePerUnit = pricePerUnit;
    if (quantity && quantity > 0) listing.quantity = Number(quantity);
    listing.updatedAt = new Date().toISOString();

    db.addAudit({
      actorUserId: user.id,
      actorName: user.fullName,
      actorBusinessId: user.businessId,
      action: 'LISTING_UPDATED',
      entityType: 'listing',
      entityId: listing.id,
      summary: `Updated listing "${listing.title}" (status: ${listing.status}).`,
    });

    res.json({listing});
  });

  // 6. Buyer-Supplier Matching Engine
  router.get('/matches', (req, res) => {
    const {commoditySlug, corridor, minQuantity, rfqId} = req.query as Record<string, string>;
    const matches = db.computeMatchesForQuery({
      commoditySlug: commoditySlug || undefined,
      corridor: corridor && corridor !== 'ALL' ? corridor : undefined,
      minQuantity: minQuantity ? Number(minQuantity) : undefined,
      rfqId: rfqId || undefined,
    });
    res.json({matches});
  });

  // 7. RFQ & Quotation Engine
  router.get('/rfqs', (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser;
    const isAdminOrDesk = user && (user.isPlatformAdmin || user.isTradeDeskStaff);

    // Public/demo visitors see open RFQs summary; signed-in users see their own RFQs + open/invited RFQs
    const visibleRfqs = db.rfqs.filter((r) => {
      if (isAdminOrDesk) return true;
      if (user && r.buyerBusinessId === user.businessId) return true;
      if (user && r.invitedBusinessIds.includes(user.businessId)) return true;
      return r.openToMatchingSuppliers && r.status !== 'draft';
    });

    const enriched = visibleRfqs.map((r) => {
      const quotes = db.quotations.filter((q) => {
        if (q.rfqId !== r.id) return false;
        if (isAdminOrDesk) return true;
        if (user && r.buyerBusinessId === user.businessId) return true;
        if (user && q.supplierBusinessId === user.businessId) return true;
        // Protect supplier commercial pricing from competing suppliers
        return false;
      });
      return {
        ...r,
        quotationCount: db.quotations.filter((q) => q.rfqId === r.id).length,
        quotations: quotes,
      };
    });

    res.json({rfqs: enriched});
  });

  router.post('/rfqs', auth.requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const biz = db.businesses.find((b) => b.id === user.businessId);
    if (!biz) {
      res.status(400).json({error: 'Business profile required to issue an RFQ.'});
      return;
    }

    const body = req.body as {
      corridor: MarketplaceCorridor;
      commoditySlug: string;
      title: string;
      specifications: Record<string, string | number>;
      quantity: number;
      unit: string;
      destinationPortOrCity: string;
      preferredOrigin: string;
      incotermPreference: string;
      targetBudgetPerUnit?: number;
      currency: 'USD' | 'ZAR' | 'CNY' | 'EUR';
      responseDeadline: string;
      requiredCertifications: string[];
      invitedBusinessIds?: string[];
      openToMatchingSuppliers?: boolean;
      linkedListingId?: string;
      notes?: string;
    };

    const commodity = db.commodities.find((c) => c.slug === body.commoditySlug);
    if (!commodity || !body.title?.trim() || !body.quantity || body.quantity <= 0) {
      res.status(400).json({error: 'Commodity, title, and valid quantity are required.'});
      return;
    }

    const rfqId = `rfq_${crypto.randomUUID().slice(0, 8)}`;
    const code = `RFQ-${(body.corridor || 'GLB').replace('-', '')}-2026-${Math.floor(100 + Math.random() * 899)}`;
    const newRfq = {
      id: rfqId,
      referenceCode: code,
      buyerBusinessId: biz.id,
      buyerBusinessName: biz.name,
      buyerCountry: biz.country,
      corridor: body.corridor || 'CN-ZA',
      commoditySlug: commodity.slug,
      commodityName: commodity.name,
      title: body.title.trim(),
      specifications: body.specifications || {},
      quantity: Number(body.quantity),
      unit: body.unit?.trim() || commodity.defaultUnit,
      destinationPortOrCity: body.destinationPortOrCity?.trim() || biz.city,
      preferredOrigin: body.preferredOrigin?.trim() || 'Open to Verified Origins',
      incotermPreference: body.incotermPreference?.trim() || 'CIF',
      targetBudgetPerUnit: body.targetBudgetPerUnit ? Number(body.targetBudgetPerUnit) : undefined,
      currency: body.currency || 'USD',
      responseDeadline: body.responseDeadline || '2026-12-30',
      requiredCertifications: Array.isArray(body.requiredCertifications)
        ? body.requiredCertifications
        : [],
      invitedBusinessIds: Array.isArray(body.invitedBusinessIds) ? body.invitedBusinessIds : [],
      openToMatchingSuppliers: body.openToMatchingSuppliers !== false,
      linkedListingId: body.linkedListingId,
      status: 'open' as const,
      notes: body.notes?.trim() || '',
      isDemo: false,
      createdAt: new Date().toISOString(),
    };

    db.rfqs.unshift(newRfq);
    db.addAudit({
      actorUserId: user.id,
      actorName: user.fullName,
      actorBusinessId: biz.id,
      action: 'RFQ_ISSUED',
      entityType: 'rfq',
      entityId: newRfq.id,
      summary: `Issued ${newRfq.referenceCode} for ${newRfq.quantity} ${newRfq.unit} of ${newRfq.commodityName}.`,
    });

    res.status(201).json({rfq: {...newRfq, quotationCount: 0, quotations: []}});
  });

  router.post(
    '/rfqs/:id/quotations',
    auth.requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      const biz = db.businesses.find((b) => b.id === user.businessId);
      const rfq = db.rfqs.find((r) => r.id === req.params.id);
      if (!rfq || !biz) {
        res.status(404).json({error: 'RFQ or supplier business not found.'});
        return;
      }
      if (rfq.buyerBusinessId === biz.id) {
        res.status(400).json({error: 'A buyer cannot submit a quotation on their own RFQ.'});
        return;
      }

      const body = req.body as {
        pricePerUnit: number;
        currency: 'USD' | 'ZAR' | 'CNY' | 'EUR';
        minimumQuantity: number;
        incoterm: string;
        originLocation: string;
        estimatedLeadTimeDays: number;
        validityDate: string;
        attachedDocuments: string[];
        technicalNotes: string;
        sellerRole?: SellerDisclosureRole;
        intermediaryDisclosure?: IntermediaryDisclosure;
      };

      if (!body.pricePerUnit || Number(body.pricePerUnit) <= 0) {
        res.status(400).json({error: 'Valid positive price per unit is required.'});
        return;
      }

      const now = new Date().toISOString();
      const quote = {
        id: `quo_${crypto.randomUUID().slice(0, 8)}`,
        rfqId: rfq.id,
        supplierBusinessId: biz.id,
        supplierBusinessName: biz.name,
        supplierCountry: biz.country,
        supplierVerificationLevel: biz.verificationLevel,
        sellerRole: body.sellerRole || 'stockist_supplier',
        intermediaryDisclosure: body.intermediaryDisclosure || {isIntermediary: false},
        pricePerUnit: Number(body.pricePerUnit),
        currency: body.currency || rfq.currency,
        minimumQuantity: Number(body.minimumQuantity) || rfq.quantity,
        unit: rfq.unit,
        incoterm: body.incoterm?.trim() || rfq.incotermPreference,
        originLocation: body.originLocation?.trim() || biz.city,
        estimatedLeadTimeDays: Number(body.estimatedLeadTimeDays) || 21,
        validityDate: body.validityDate || '2026-12-31',
        attachedDocuments: Array.isArray(body.attachedDocuments) ? body.attachedDocuments : [],
        technicalNotes: body.technicalNotes?.trim() || '',
        status: 'submitted' as const,
        createdAt: now,
        updatedAt: now,
      };

      db.quotations.unshift(quote);
      if (rfq.status === 'open') rfq.status = 'under_evaluation';

      db.addAudit({
        actorUserId: user.id,
        actorName: user.fullName,
        actorBusinessId: biz.id,
        action: 'QUOTATION_SUBMITTED',
        entityType: 'quotation',
        entityId: quote.id,
        summary: `${biz.name} submitted quotation (${quote.currency} ${quote.pricePerUnit}/${quote.unit}) on ${rfq.referenceCode}.`,
      });

      res.status(201).json({quotation: quote});
    }
  );

  router.patch(
    '/quotations/:id/status',
    auth.requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      const quote = db.quotations.find((q) => q.id === req.params.id);
      if (!quote) {
        res.status(404).json({error: 'Quotation not found.'});
        return;
      }
      const rfq = db.rfqs.find((r) => r.id === quote.rfqId);
      if (!rfq) {
        res.status(404).json({error: 'Associated RFQ not found.'});
        return;
      }

      const {status} = req.body as {status: QuotationStatus};
      const isBuyerOwner = rfq.buyerBusinessId === user.businessId;
      const isSupplierOwner = quote.supplierBusinessId === user.businessId;

      if (status === 'withdrawn') {
        if (!isSupplierOwner && !user.isPlatformAdmin) {
          res.status(403).json({error: 'Only the submitting supplier can withdraw a quotation.'});
          return;
        }
      } else if (['shortlisted', 'accepted', 'rejected'].includes(status)) {
        if (!isBuyerOwner && !user.isPlatformAdmin) {
          res.status(403).json({error: 'Only the issuing buyer can shortlist, accept, or reject quotations.'});
          return;
        }
      } else {
        res.status(400).json({error: 'Invalid quotation status transition.'});
        return;
      }

      quote.status = status;
      quote.updatedAt = new Date().toISOString();
      if (status === 'shortlisted') rfq.status = 'shortlisted';
      if (status === 'accepted') rfq.status = 'awarded';

      db.addAudit({
        actorUserId: user.id,
        actorName: user.fullName,
        actorBusinessId: user.businessId,
        action: `QUOTATION_${status.toUpperCase()}`,
        entityType: 'quotation',
        entityId: quote.id,
        summary: `Quotation ${quote.id} marked "${status}" on ${rfq.referenceCode}.`,
      });

      res.json({quotation: quote, rfqStatus: rfq.status});
    }
  );

  // 8. Messaging & Negotiation
  router.get('/messages', auth.requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const isAdminOrDesk = user.isPlatformAdmin || user.isTradeDeskStaff;
    const threads = db.conversations
      .filter((c) => isAdminOrDesk || c.participantBusinessIds.includes(user.businessId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({conversations: threads});
  });

  router.post('/messages', auth.requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const senderBiz = db.businesses.find((b) => b.id === user.businessId);
    if (!senderBiz) {
      res.status(400).json({error: 'Sender business not found.'});
      return;
    }

    const {conversationId, toBusinessId, subject, body, linkedListingId, linkedRfqId, attachmentName} =
      req.body as {
        conversationId?: string;
        toBusinessId?: string;
        subject?: string;
        body: string;
        linkedListingId?: string;
        linkedRfqId?: string;
        attachmentName?: string;
      };

    if (!body?.trim()) {
      res.status(400).json({error: 'Message text is required.'});
      return;
    }

    const now = new Date().toISOString();
    const newMsg = {
      id: `msg_${crypto.randomUUID().slice(0, 8)}`,
      senderUserId: user.id,
      senderName: user.fullName,
      senderBusinessId: senderBiz.id,
      senderBusinessName: senderBiz.name,
      body: body.trim(),
      attachmentName: attachmentName?.trim() || undefined,
      createdAt: now,
      readByRecipient: false,
    };

    if (conversationId) {
      const existing = db.conversations.find((c) => c.id === conversationId);
      if (!existing) {
        res.status(404).json({error: 'Conversation thread not found.'});
        return;
      }
      if (
        !existing.participantBusinessIds.includes(user.businessId) &&
        !user.isPlatformAdmin &&
        !user.isTradeDeskStaff
      ) {
        res.status(403).json({error: 'Not authorised to post in this conversation.'});
        return;
      }
      existing.messages.push(newMsg);
      existing.updatedAt = now;
      res.status(201).json({conversation: existing});
      return;
    }

    const recipientBiz = db.businesses.find((b) => b.id === toBusinessId);
    if (!recipientBiz) {
      res.status(400).json({error: 'Recipient business is required for a new conversation.'});
      return;
    }

    const listing = linkedListingId ? db.listings.find((l) => l.id === linkedListingId) : undefined;
    const rfq = linkedRfqId ? db.rfqs.find((r) => r.id === linkedRfqId) : undefined;

    const thread = {
      id: `conv_${crypto.randomUUID().slice(0, 8)}`,
      subject:
        subject?.trim() ||
        (rfq ? `${rfq.referenceCode} — ${rfq.title}` : listing ? listing.title : `Commercial Enquiry with ${recipientBiz.name}`),
      participantBusinessIds: [senderBiz.id, recipientBiz.id],
      participantBusinessNames: [senderBiz.name, recipientBiz.name],
      linkedListingId: listing?.id,
      linkedListingTitle: listing?.title,
      linkedRfqId: rfq?.id,
      linkedRfqCode: rfq?.referenceCode,
      messages: [newMsg],
      updatedAt: now,
    };

    db.conversations.unshift(thread);
    res.status(201).json({conversation: thread});
  });

  // 9. Trade Opportunities & Intelligence & Landed Cost Calculator
  router.get('/opportunities', (req, res) => {
    const {corridor} = req.query as Record<string, string>;
    const items =
      corridor && corridor !== 'ALL'
        ? db.opportunities.filter((o) => o.corridor === corridor)
        : db.opportunities;
    res.json({opportunities: items});
  });

  router.get('/intelligence', (_req, res) => {
    res.json(db.getIntelligence());
  });

  router.post('/landed-cost/calculate', (req, res: Response) => {
    const input = req.body as Partial<LandedCostInput>;
    if (!input || !input.quantity || Number(input.quantity) <= 0 || !input.unitSupplierPrice) {
      res.status(400).json({error: 'Valid quantity and supplier price are required.'});
      return;
    }
    const normalized: LandedCostInput = {
      corridor: input.corridor || 'CN-ZA',
      commodityName: input.commodityName || 'Industrial Commodity',
      hsCode: input.hsCode || 'Unclassified — Verify HS Tariff',
      quantity: Number(input.quantity),
      unit: input.unit || 'MT',
      unitSupplierPrice: Number(input.unitSupplierPrice),
      supplierCurrency: input.supplierCurrency || 'USD',
      exchangeRateToZar: Number(input.exchangeRateToZar) || 18.2,
      incotermBase: input.incotermBase || 'FOB',
      oceanFreightTotalUsd: Number(input.oceanFreightTotalUsd ?? 4200),
      marineInsurancePct: Number(input.marineInsurancePct ?? 0.35),
      customsDutyPct: Number(input.customsDutyPct ?? 0),
      importVatPct: Number(input.importVatPct ?? 15),
      portHandlingZar: Number(input.portHandlingZar ?? 18500),
      customsClearanceZar: Number(input.customsClearanceZar ?? 7500),
      inlandHaulageZar: Number(input.inlandHaulageZar ?? 32000),
      otherFeesZar: Number(input.otherFeesZar ?? 4500),
    };
    res.json({breakdown: db.calculateLandedCost(normalized)});
  });

  // 10. Trade Desk CRM (Authorised Trade Desk Staff / Admin only)
  router.get(
    '/trade-desk/pipeline',
    auth.requireAuth,
    auth.requireTradeDesk,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({deals: db.tradeDeskDeals});
    }
  );

  router.post(
    '/trade-desk/deals',
    auth.requireAuth,
    auth.requireTradeDesk,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      const body = req.body as {
        title: string;
        corridor: MarketplaceCorridor;
        commoditySlug: string;
        buyerBusinessName: string;
        supplierBusinessName?: string;
        estimatedValueUsd: number;
        quantity: number;
        unit: string;
        commissionEstimateUsd: number;
        lastContactNote: string;
        nextFollowUpDate: string;
      };
      const commodity = db.commodities.find((c) => c.slug === body.commoditySlug);
      if (!body.title?.trim() || !body.buyerBusinessName?.trim()) {
        res.status(400).json({error: 'Deal title and buyer business name are required.'});
        return;
      }
      const deal = {
        id: `td_${crypto.randomUUID().slice(0, 8)}`,
        referenceCode: `TD-2026-${Math.floor(100 + Math.random() * 899)}`,
        title: body.title.trim(),
        corridor: body.corridor || 'CN-ZA',
        commodityName: commodity?.name || 'General Commodity',
        commoditySlug: commodity?.slug || 'manganese-ore',
        buyerBusinessName: body.buyerBusinessName.trim(),
        supplierBusinessName: body.supplierBusinessName?.trim(),
        estimatedValueUsd: Number(body.estimatedValueUsd) || 0,
        quantity: Number(body.quantity) || 1,
        unit: body.unit?.trim() || commodity?.defaultUnit || 'MT',
        commissionEstimateUsd: Number(body.commissionEstimateUsd) || 0,
        stage: 'research_lead' as const,
        assignedOfficer: user.fullName,
        lastContactNote: body.lastContactNote?.trim() || 'Initial Trade Desk intake logged.',
        nextFollowUpDate: body.nextFollowUpDate || '2026-12-05',
        updatedAt: new Date().toISOString(),
      };
      db.tradeDeskDeals.unshift(deal);
      db.addAudit({
        actorUserId: user.id,
        actorName: user.fullName,
        actorBusinessId: user.businessId,
        action: 'TRADE_DESK_DEAL_CREATED',
        entityType: 'trade_desk',
        entityId: deal.id,
        summary: `Created Trade Desk pipeline record ${deal.referenceCode}: ${deal.title}.`,
      });
      res.status(201).json({deal});
    }
  );

  router.patch(
    '/trade-desk/deals/:id',
    auth.requireAuth,
    auth.requireTradeDesk,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      const deal = db.tradeDeskDeals.find((d) => d.id === req.params.id);
      if (!deal) {
        res.status(404).json({error: 'Trade Desk deal not found.'});
        return;
      }
      const {stage, lastContactNote, nextFollowUpDate} = req.body as {
        stage?: TradeDeskStage;
        lastContactNote?: string;
        nextFollowUpDate?: string;
      };
      if (stage) deal.stage = stage;
      if (lastContactNote) deal.lastContactNote = lastContactNote.trim();
      if (nextFollowUpDate) deal.nextFollowUpDate = nextFollowUpDate;
      deal.updatedAt = new Date().toISOString();

      db.addAudit({
        actorUserId: user.id,
        actorName: user.fullName,
        actorBusinessId: user.businessId,
        action: 'TRADE_DESK_STAGE_UPDATED',
        entityType: 'trade_desk',
        entityId: deal.id,
        summary: `Updated ${deal.referenceCode} to stage "${deal.stage}".`,
      });
      res.json({deal});
    }
  );

  // 11. Platform Administration (Admin only)
  router.get(
    '/admin/overview',
    auth.requireAuth,
    auth.requireAdmin,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({
        metrics: {
          totalBusinesses: db.businesses.filter((b) => b.id !== 'biz_terra_ops').length,
          activeListings: db.listings.filter((l) => l.status === 'active').length,
          openRfqs: db.rfqs.filter((r) => r.status !== 'closed').length,
          tradeDeskDeals: db.tradeDeskDeals.length,
        },
        businesses: db.businesses.filter((b) => b.id !== 'biz_terra_ops'),
        listings: db.listings,
        auditLogs: db.auditLogs.slice(0, 40),
      });
    }
  );

  router.patch(
    '/admin/businesses/:id/verify',
    auth.requireAuth,
    auth.requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      const biz = db.businesses.find((b) => b.id === req.params.id);
      if (!biz) {
        res.status(404).json({error: 'Business not found.'});
        return;
      }
      const {verificationLevel, verificationSummary} = req.body as {
        verificationLevel: VerificationLevel;
        verificationSummary?: string;
      };
      if (!verificationLevel || verificationLevel < 1 || verificationLevel > 6) {
        res.status(400).json({error: 'Verification level must be between 1 and 6.'});
        return;
      }
      biz.verificationLevel = verificationLevel;
      if (verificationSummary?.trim()) {
        biz.verificationSummary = verificationSummary.trim();
      }
      // Propagate updated verification badge to existing listings by this business
      for (const l of db.listings) {
        if (l.businessId === biz.id) l.verificationLevel = verificationLevel;
      }
      for (const d of biz.documents) {
        if (d.status === 'submitted') {
          d.status = 'verified';
          d.reviewedAt = new Date().toISOString();
        }
      }
      db.addAudit({
        actorUserId: user.id,
        actorName: user.fullName,
        actorBusinessId: user.businessId,
        action: 'VERIFICATION_UPDATED',
        entityType: 'business',
        entityId: biz.id,
        summary: `Set ${biz.name} to Verification Level ${verificationLevel}.`,
      });
      res.json({business: biz});
    }
  );

  router.patch(
    '/admin/listings/:id/moderate',
    auth.requireAuth,
    auth.requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      const listing = db.listings.find((l) => l.id === req.params.id);
      if (!listing) {
        res.status(404).json({error: 'Listing not found.'});
        return;
      }
      const {status} = req.body as {status: ListingStatus};
      listing.status = status;
      listing.updatedAt = new Date().toISOString();
      db.addAudit({
        actorUserId: user.id,
        actorName: user.fullName,
        actorBusinessId: user.businessId,
        action: 'LISTING_MODERATED',
        entityType: 'listing',
        entityId: listing.id,
        summary: `Admin set listing "${listing.title}" status to "${status}".`,
      });
      res.json({listing});
    }
  );

  return router;
}
