import crypto from 'crypto';
import type {
  AuditEvent,
  BusinessAccount,
  CommodityTemplate,
  ConversationThread,
  LandedCostBreakdown,
  LandedCostInput,
  MarketplaceListing,
  MatchRecommendation,
  QuotationRecord,
  RfqRecord,
  TradeDeskDeal,
  TradeIntelligencePayload,
  TradeOpportunity,
  UserAccount,
} from '../src/types/terraexchange.js';
import {hashPassword} from './auth.js';

export interface StoredUser extends UserAccount {
  passwordHash: string;
}

class TerraExchangeStore {
  public commodities: CommodityTemplate[] = [];
  public businesses: BusinessAccount[] = [];
  public users: StoredUser[] = [];
  public listings: MarketplaceListing[] = [];
  public rfqs: RfqRecord[] = [];
  public quotations: QuotationRecord[] = [];
  public conversations: ConversationThread[] = [];
  public tradeDeskDeals: TradeDeskDeal[] = [];
  public opportunities: TradeOpportunity[] = [];
  public auditLogs: AuditEvent[] = [];

  constructor() {
    this.seedInitialData();
  }

  public addAudit(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    this.auditLogs.unshift({
      ...event,
      id: `aud_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    });
  }

  public getPublicUser(user: StoredUser): UserAccount {
    const {passwordHash: _omitted, ...publicUser} = user;
    return publicUser;
  }

  public sanitizeBusinessForViewer(
    biz: BusinessAccount,
    viewer?: UserAccount
  ): BusinessAccount {
    const isOwner = viewer && viewer.businessId === biz.id;
    const isAdminOrDesk = viewer && (viewer.isPlatformAdmin || viewer.isTradeDeskStaff);
    if (isOwner || isAdminOrDesk) {
      return biz;
    }
    // Redact private registration/tax numbers and internal docs from public marketplace view
    return {
      ...biz,
      registrationNumber: 'Verified on file (confidential)',
      taxNumber: undefined,
      documents: biz.documents.map((d) => ({
        ...d,
        referenceNumber: 'Confidential',
      })),
    };
  }

  public computeMatchesForQuery(params: {
    commoditySlug?: string;
    corridor?: string;
    minQuantity?: number;
    rfqId?: string;
  }): MatchRecommendation[] {
    let targetSlug = params.commoditySlug;
    let targetQty = params.minQuantity || 0;
    let targetCorridor = params.corridor;

    if (params.rfqId) {
      const rfq = this.rfqs.find((r) => r.id === params.rfqId);
      if (rfq) {
        targetSlug = rfq.commoditySlug;
        targetQty = rfq.quantity;
        targetCorridor = rfq.corridor;
      }
    }

    const activeSupplies = this.listings.filter(
      (l) => l.type === 'supply' && l.status === 'active'
    );

    const results: MatchRecommendation[] = [];

    for (const supply of activeSupplies) {
      if (targetSlug && supply.commoditySlug !== targetSlug) continue;

      let score = 45;
      const reasons: string[] = [];

      if (targetSlug && supply.commoditySlug === targetSlug) {
        score += 20;
        reasons.push(`Exact commodity match (${supply.commodityName})`);
      }

      if (targetCorridor && supply.corridor === targetCorridor) {
        score += 12;
        reasons.push(`Active on ${supply.corridor} trade corridor`);
      } else {
        reasons.push(`Available via ${supply.corridor} export logistics`);
      }

      if (targetQty > 0) {
        if (supply.quantity >= targetQty && supply.minOrderQuantity <= targetQty) {
          score += 15;
          reasons.push(
            `Capacity covers ${targetQty.toLocaleString()} ${supply.unit} (MOQ ${supply.minOrderQuantity.toLocaleString()})`
          );
        } else if (supply.quantity >= targetQty * 0.5) {
          score += 6;
          reasons.push(`Partial allocation available (${supply.quantity.toLocaleString()} ${supply.unit})`);
        }
      } else {
        score += 8;
        reasons.push(`Ready allocation of ${supply.quantity.toLocaleString()} ${supply.unit}`);
      }

      if (supply.verificationLevel >= 5) {
        score += 8;
        reasons.push(`Level ${supply.verificationLevel} verification with supply documentation reviewed`);
      } else if (supply.verificationLevel >= 3) {
        score += 4;
        reasons.push(`Level ${supply.verificationLevel} business identity reviewed`);
      }

      if (supply.sellerRole === 'producer_owner' || supply.sellerRole === 'manufacturer_exporter') {
        reasons.push('Direct producer or manufacturer disclosure');
      } else if (supply.intermediaryDisclosure.isIntermediary) {
        reasons.push('Disclosed mandated intermediary');
      }

      results.push({
        id: `match_${supply.id}`,
        supplyListingId: supply.id,
        supplyTitle: supply.title,
        supplierBusinessId: supply.businessId,
        supplierName: supply.businessName,
        supplierCountry: supply.businessCountry,
        supplierVerificationLevel: supply.verificationLevel,
        commodityName: supply.commodityName,
        corridor: supply.corridor,
        score: Math.min(98, score),
        reasons,
        pricePerUnit: supply.pricePerUnit,
        currency: supply.currency,
        quantityAvailable: supply.quantity,
        unit: supply.unit,
        incoterms: supply.incoterms,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  public calculateLandedCost(input: LandedCostInput): LandedCostBreakdown {
    const goodsValueSource = input.quantity * input.unitSupplierPrice;
    const goodsValueZar = goodsValueSource * input.exchangeRateToZar;
    // Approximate USD/ZAR conversion derived when supplier is not USD
    const usdToZar =
      input.supplierCurrency === 'USD'
        ? input.exchangeRateToZar
        : input.supplierCurrency === 'ZAR'
        ? 18.2
        : 18.2;

    const freightZar =
      input.incotermBase === 'CIF' ? 0 : input.oceanFreightTotalUsd * usdToZar;
    const insuranceZar =
      input.incotermBase === 'CIF'
        ? 0
        : (goodsValueZar + freightZar) * (input.marineInsurancePct / 100);

    const cifCustomsValueZar = goodsValueZar + freightZar + insuranceZar;
    const customsDutyZar = cifCustomsValueZar * (input.customsDutyPct / 100);
    // Standard South African Import VAT Added Tax Value (ATV): (Customs Value + 10% uplift + Customs Duty)
    const addedTaxValueAtvZar =
      input.corridor === 'ZA-EXPORT'
        ? 0
        : cifCustomsValueZar * 1.1 + customsDutyZar;
    const importVatZar = addedTaxValueAtvZar * (input.importVatPct / 100);

    const portAndClearanceZar = input.portHandlingZar + input.customsClearanceZar;
    const inlandAndOtherZar = input.inlandHaulageZar + input.otherFeesZar;

    const totalLandedCostZar =
      cifCustomsValueZar +
      customsDutyZar +
      importVatZar +
      portAndClearanceZar +
      inlandAndOtherZar;

    const landedCostPerUnitZar =
      input.quantity > 0 ? totalLandedCostZar / input.quantity : 0;
    const landedCostPerUnitUsd = landedCostPerUnitZar / usdToZar;

    return {
      input,
      goodsValueZar: Number(goodsValueZar.toFixed(2)),
      freightZar: Number(freightZar.toFixed(2)),
      insuranceZar: Number(insuranceZar.toFixed(2)),
      cifCustomsValueZar: Number(cifCustomsValueZar.toFixed(2)),
      customsDutyZar: Number(customsDutyZar.toFixed(2)),
      addedTaxValueAtvZar: Number(addedTaxValueAtvZar.toFixed(2)),
      importVatZar: Number(importVatZar.toFixed(2)),
      portAndClearanceZar: Number(portAndClearanceZar.toFixed(2)),
      inlandAndOtherZar: Number(inlandAndOtherZar.toFixed(2)),
      totalLandedCostZar: Number(totalLandedCostZar.toFixed(2)),
      landedCostPerUnitZar: Number(landedCostPerUnitZar.toFixed(2)),
      landedCostPerUnitUsd: Number(landedCostPerUnitUsd.toFixed(2)),
      disclaimer:
        'Indicative estimate only. Final customs duty, SARS ATV uplift, VAT treatment, and port disbursements require formal HS tariff classification, verified certificate of origin, customs valuation ruling, and licensed clearing agent confirmation.',
    };
  }

  public getIntelligence(): TradeIntelligencePayload {
    const activeListings = this.listings.filter((l) => l.status === 'active');
    const countByCorridor = (corridor: 'SA' | 'CN-ZA' | 'GLOBAL', type: 'supply' | 'demand') =>
      activeListings.filter((l) => l.corridor === corridor && l.type === type).length;

    return {
      corridorMetrics: [
        {
          corridor: 'CN-ZA',
          label: 'China ↔ South Africa Corridor',
          activeSupplyCount: countByCorridor('CN-ZA', 'supply'),
          activeDemandCount: countByCorridor('CN-ZA', 'demand'),
          openRfqCount: this.rfqs.filter((r) => r.corridor === 'CN-ZA' && r.status !== 'closed').length,
          primaryPorts: 'Richards Bay / Durban ↔ Tianjin / Qingdao / Shanghai',
          notes:
            'Two-way industrial corridor combining South African mineral exports (manganese, chrome) with Chinese industrial machinery, chemicals, and power equipment imports.',
          dataClassification: 'Platform Activity',
        },
        {
          corridor: 'SA',
          label: 'TerraExchange SA Domestic',
          activeSupplyCount: countByCorridor('SA', 'supply'),
          activeDemandCount: countByCorridor('SA', 'demand'),
          openRfqCount: this.rfqs.filter((r) => r.corridor === 'SA' && r.status !== 'closed').length,
          primaryPorts: 'Gauteng Industrial Belt / Northern Cape / Durban / Cape Town',
          notes:
            'Domestic South African sourcing for smelters, agro-processors, construction stockists, and industrial procurement teams.',
          dataClassification: 'Platform Activity',
        },
        {
          corridor: 'GLOBAL',
          label: 'TerraExchange Global Corridors',
          activeSupplyCount: countByCorridor('GLOBAL', 'supply'),
          activeDemandCount: countByCorridor('GLOBAL', 'demand'),
          openRfqCount: this.rfqs.filter((r) => r.corridor === 'GLOBAL' && r.status !== 'closed').length,
          primaryPorts: 'Durban / Dar es Salaam / Rotterdam / Jebel Ali / Ningbo',
          notes:
            'Cross-border physical commodities connecting SADC producers with European, Middle Eastern, and Asian industrial buyers.',
          dataClassification: 'Platform Activity',
        },
      ],
      commodityBenchmarks: [
        {
          commoditySlug: 'manganese-ore',
          commodityName: 'Manganese Ore (36%–44% Mn)',
          referenceRange: 'USD 185 – 235',
          unit: 'DMT',
          typicalIncoterm: 'FOB Port Elizabeth / CIF Tianjin',
          corridorTrend: 'Steady steel-mill restocking demand in North China ports',
          dataClassification: 'User-Submitted Supply Average',
        },
        {
          commoditySlug: 'copper-cathodes',
          commodityName: 'Electrolytic Copper Cathodes (Grade A)',
          referenceRange: 'USD 8,950 – 9,380',
          unit: 'MT',
          typicalIncoterm: 'FOB Durban / CIF Shanghai',
          corridorTrend: 'Tight physical cathode availability across SADC export terminals',
          dataClassification: 'Indicative Estimate',
        },
        {
          commoditySlug: 'yellow-maize',
          commodityName: 'Non-GMO Yellow Maize (Grade YM1)',
          referenceRange: 'ZAR 4,150 – 4,480',
          unit: 'MT',
          typicalIncoterm: 'EXW Free State Silo / FOB Durban',
          corridorTrend: 'Active regional milling procurement ahead of seasonal rail allocations',
          dataClassification: 'User-Submitted Supply Average',
        },
        {
          commoditySlug: 'ore-crushing-machinery',
          commodityName: 'Modular Jaw & Cone Crushing Plant',
          referenceRange: 'USD 145,000 – 310,000',
          unit: 'Unit',
          typicalIncoterm: 'FOB Qingdao / CIF Durban',
          corridorTrend: 'Strong SA mid-tier mining capex enquiry on 150–300 TPH plants',
          dataClassification: 'User-Submitted Supply Average',
        },
      ],
      complianceNotices: [
        {
          id: 'comp_1',
          jurisdiction: 'South Africa (SARS / ITAC)',
          commodityGroup: 'Ferrous & Base Metal Scrap / Selected Minerals',
          requirement:
            'Export permits required from ITAC and mineral export clearance verification prior to vessel loading.',
        },
        {
          id: 'comp_2',
          jurisdiction: 'China Customs (GACC)',
          commodityGroup: 'Agricultural & Agroprocessed Imports',
          requirement:
            'Exporter facility registration with GACC and phytosanitary certification required before shipment.',
        },
        {
          id: 'comp_3',
          jurisdiction: 'International Maritime (IMDG / IMSBC)',
          commodityGroup: 'Bulk Ores, Concentrates & Industrial Chemicals',
          requirement:
            'Transportable Moisture Limit (TML) certificate and MSDS mandatory for bulk maritime carriage.',
        },
      ],
    };
  }

  private seedInitialData() {
    this.commodities = [
      {
        id: 'com_mn',
        slug: 'manganese-ore',
        name: 'Manganese Ore',
        category: 'Ferrous Metals',
        hsCodeReference: '2602.00',
        defaultUnit: 'MT',
        description:
          'Metallurgical lump and fines manganese ore sourced primarily from the Kalahari Manganese Field for ferroalloy and steelmaking.',
        primaryCorridors: ['CN-ZA', 'SA', 'GLOBAL'],
        imageUrl: '/src/assets/images/commodity_manganese_1795680023554.jpg',
        specFields: [
          {key: 'grade', label: 'Ore Grade', type: 'select', options: ['High Grade (44%+)', 'Medium Grade (37-42%)', 'Low Grade (32-36%)'], required: true},
          {key: 'mn_pct', label: 'Mn Content', type: 'number', unit: '%', required: true, placeholder: 'e.g. 38.5'},
          {key: 'fe_pct', label: 'Iron (Fe) Content', type: 'number', unit: '%', required: true, placeholder: 'e.g. 14.2'},
          {key: 'sio2_pct', label: 'Silica (SiO2)', type: 'number', unit: '%', placeholder: 'e.g. 6.5'},
          {key: 'p_pct', label: 'Phosphorus (P)', type: 'number', unit: '%', placeholder: 'e.g. 0.04'},
          {key: 'moisture_pct', label: 'Moisture Max', type: 'number', unit: '%', placeholder: 'e.g. 3.0'},
          {key: 'particle_size', label: 'Particle Size', type: 'text', required: true, placeholder: 'e.g. 10-75mm lump'},
        ],
      },
      {
        id: 'com_cu',
        slug: 'copper-cathodes',
        name: 'Copper Cathodes',
        category: 'Base Metals',
        hsCodeReference: '7403.11',
        defaultUnit: 'MT',
        description:
          'Electrolytic Grade A copper cathodes meeting ASTM B115 / BS EN 1978 standards for rod, wire, and industrial electrical manufacturing.',
        primaryCorridors: ['GLOBAL', 'CN-ZA', 'SA'],
        imageUrl: '/src/assets/images/commodity_copper_1795680024616.jpg',
        specFields: [
          {key: 'purity_pct', label: 'Copper Purity (Cu)', type: 'number', unit: '%', required: true, placeholder: 'e.g. 99.99'},
          {key: 'grade', label: 'Cathode Grade', type: 'select', options: ['Grade A (LME Spec)', 'Non-Registered Grade A', 'Standard Industrial'], required: true},
          {key: 'standards', label: 'Applicable Standard', type: 'text', required: true, placeholder: 'e.g. ASTM B115 / EN 1978'},
          {key: 'dimensions', label: 'Sheet Dimensions', type: 'text', placeholder: 'e.g. 914mm x 914mm x 12mm'},
        ],
      },
      {
        id: 'com_maize',
        slug: 'yellow-maize',
        name: 'Yellow & White Maize',
        category: 'Agricultural Commodities',
        hsCodeReference: '1005.90',
        defaultUnit: 'MT',
        description:
          'South African silo-graded yellow and white maize for animal feed milling, food agro-processing, and regional export contracts.',
        primaryCorridors: ['SA', 'GLOBAL', 'CN-ZA'],
        imageUrl: '/src/assets/images/commodity_maize_1795680025348.jpg',
        specFields: [
          {key: 'grade', label: 'Silo Grade', type: 'select', options: ['WM1', 'WM2', 'YM1', 'YM2'], required: true},
          {key: 'moisture_pct', label: 'Moisture Max', type: 'number', unit: '%', required: true, placeholder: 'e.g. 12.5'},
          {key: 'foreign_matter_pct', label: 'Foreign Matter Max', type: 'number', unit: '%', placeholder: 'e.g. 1.0'},
          {key: 'crop_year', label: 'Crop Season', type: 'text', required: true, placeholder: 'e.g. 2025/2026'},
          {key: 'gmo_status', label: 'GMO Status', type: 'select', options: ['Non-GMO', 'Conventional Commercial']},
        ],
      },
      {
        id: 'com_mach',
        slug: 'ore-crushing-machinery',
        name: 'Mineral Crushing & Screening Equipment',
        category: 'Machinery & Industrial Equipment',
        hsCodeReference: '8474.20',
        defaultUnit: 'Unit',
        description:
          'Heavy-duty jaw crushers, cone crushers, and vibrating screens engineered for Southern African mining and aggregate operations.',
        primaryCorridors: ['CN-ZA', 'GLOBAL'],
        imageUrl: '/src/assets/images/commodity_machinery_1795680025419.jpg',
        specFields: [
          {key: 'equipment_type', label: 'Equipment Class', type: 'select', options: ['Jaw Crusher Line', 'Cone Crusher', 'Mobile Screening Plant', 'Ball Mill'], required: true},
          {key: 'throughput_tph', label: 'Throughput Capacity', type: 'number', unit: 'TPH', required: true, placeholder: 'e.g. 250'},
          {key: 'power_kw', label: 'Drive Power', type: 'number', unit: 'kW', required: true, placeholder: 'e.g. 220'},
          {key: 'voltage', label: 'Electrical Spec', type: 'text', placeholder: 'e.g. 380V-400V / 50Hz (SA Industrial)'},
          {key: 'warranty_months', label: 'OEM Warranty', type: 'number', unit: 'Months', placeholder: 'e.g. 18'},
        ],
      },
      {
        id: 'com_chrome',
        slug: 'chrome-concentrate',
        name: 'Chrome Ore Concentrate',
        category: 'Industrial Minerals',
        hsCodeReference: '2610.00',
        defaultUnit: 'MT',
        description:
          'Metallurgical and foundry-grade UG2 & LG6 chrome concentrate from the Bushveld Igneous Complex.',
        primaryCorridors: ['CN-ZA', 'SA'],
        imageUrl: '/src/assets/images/commodity_manganese_1795680023554.jpg',
        specFields: [
          {key: 'cr2o3_pct', label: 'Cr2O3 Content', type: 'number', unit: '%', required: true, placeholder: 'e.g. 42.0'},
          {key: 'cr_fe_ratio', label: 'Cr:Fe Ratio', type: 'text', required: true, placeholder: 'e.g. 1.35:1'},
          {key: 'sio2_pct', label: 'Silica (SiO2) Max', type: 'number', unit: '%', placeholder: 'e.g. 4.5'},
          {key: 'moisture_pct', label: 'Moisture Max', type: 'number', unit: '%', placeholder: 'e.g. 6.0'},
        ],
      },
      {
        id: 'com_npk',
        slug: 'npk-fertiliser',
        name: 'Granular NPK & Urea Fertiliser',
        category: 'Fertilisers',
        hsCodeReference: '3105.20',
        defaultUnit: 'MT',
        description:
          'Prilled urea 46% N and blended granular NPK fertilisers for commercial agricultural cooperatives and distributors.',
        primaryCorridors: ['CN-ZA', 'GLOBAL', 'SA'],
        imageUrl: '/src/assets/images/commodity_maize_1795680025348.jpg',
        specFields: [
          {key: 'formulation', label: 'Nutrient Ratio', type: 'text', required: true, placeholder: 'e.g. 46-0-0 or 2:3:4 (30)'},
          {key: 'granule_size', label: 'Granule Size', type: 'text', placeholder: 'e.g. 2-4mm (90% min)'},
          {key: 'moisture_pct', label: 'Moisture Max', type: 'number', unit: '%', placeholder: 'e.g. 0.5'},
          {key: 'biuret_pct', label: 'Biuret Max', type: 'number', unit: '%', placeholder: 'e.g. 1.0'},
        ],
      },
    ];

    this.businesses = [
      {
        id: 'biz_ncmc',
        name: 'Northern Cape Manganese Corp (Pty) Ltd',
        country: 'South Africa',
        city: 'Kuruman, Northern Cape',
        registrationNumber: '2016/441820/07',
        taxNumber: '9401283174',
        website: 'https://ncmanganese.example.co.za',
        address: 'Plot 14, Hotazel Industrial Corridor, Kuruman 8460',
        industry: 'Mining & Mineral Production',
        participantCategories: ['mine_producer', 'commodity_supplier', 'manufacturer_exporter'],
        verificationLevel: 6,
        verificationSummary:
          'CIPC registration, SARS tax status, DMR mining right, SGS assay reports, and Richards Bay terminal allocation reviewed.',
        corridors: ['SA', 'CN-ZA', 'GLOBAL'],
        isDemo: true,
        createdAt: '2026-09-10T08:00:00Z',
        documents: [
          {
            id: 'doc_1',
            type: 'company_registration',
            title: 'CIPC Certificate of Incorporation',
            referenceNumber: 'COR14.3-2016-441820',
            status: 'verified',
            submittedAt: '2026-09-10T09:00:00Z',
            reviewedAt: '2026-09-12T14:20:00Z',
          },
          {
            id: 'doc_2',
            type: 'assay_quality_report',
            title: 'SGS Lot Assay Certificate (38.5% Mn)',
            referenceNumber: 'SGS-ZA-2026-8812',
            status: 'verified',
            submittedAt: '2026-10-15T11:30:00Z',
            reviewedAt: '2026-10-16T10:00:00Z',
          },
        ],
      },
      {
        id: 'biz_highveld',
        name: 'Highveld Alloy & Industrial Procurement (Pty) Ltd',
        country: 'South Africa',
        city: 'Johannesburg, Gauteng',
        registrationNumber: '2019/112904/07',
        taxNumber: '9118204192',
        website: 'https://highveldalloy.example.co.za',
        address: '82 Rivonia Road, Sandton, Johannesburg 2196',
        industry: 'Ferroalloy Smelting & Industrial Procurement',
        participantCategories: ['industrial_buyer', 'processor_smelter', 'importer_wholesaler'],
        verificationLevel: 5,
        verificationSummary:
          'CIPC registration, SARS importer code, and smelting facility operational verification reviewed.',
        corridors: ['SA', 'CN-ZA', 'GLOBAL'],
        isDemo: true,
        createdAt: '2026-09-18T10:00:00Z',
        documents: [
          {
            id: 'doc_3',
            type: 'company_registration',
            title: 'CIPC Registration & Customs Importer Code',
            referenceNumber: 'IMP-ZA-77120',
            status: 'verified',
            submittedAt: '2026-09-18T12:00:00Z',
            reviewedAt: '2026-09-20T09:00:00Z',
          },
        ],
      },
      {
        id: 'biz_sinolink',
        name: 'SinoLink Heavy Machinery & Metals Co., Ltd',
        country: 'China',
        city: 'Qingdao, Shandong',
        registrationNumber: '91370200MA3N91827X',
        website: 'https://sinolink-industrial.example.cn',
        address: 'No. 48 Bonded Port Avenue, Huangdao District, Qingdao',
        industry: 'Industrial Machinery Manufacturing & Mineral Importing',
        participantCategories: ['manufacturer_exporter', 'importer_wholesaler', 'industrial_buyer'],
        verificationLevel: 5,
        verificationSummary:
          'Unified Social Credit Code, GACC export/import filing, and ISO 9001 plant audit reviewed.',
        corridors: ['CN-ZA', 'GLOBAL'],
        isDemo: true,
        createdAt: '2026-09-22T07:00:00Z',
        documents: [
          {
            id: 'doc_4',
            type: 'export_import_permit',
            title: 'PRC Business License & GACC Customs Registration',
            referenceNumber: 'CN-GACC-370291',
            status: 'verified',
            submittedAt: '2026-09-22T09:00:00Z',
            reviewedAt: '2026-09-25T16:00:00Z',
          },
        ],
      },
      {
        id: 'biz_freestate',
        name: 'Vaalharts Grain & Agro Cooperative',
        country: 'South Africa',
        city: 'Bloemfontein, Free State',
        registrationNumber: '2008/019442/24',
        website: 'https://vaalhartsgrain.example.co.za',
        address: '19 Silo Terminal Road, Bloemfontein 9301',
        industry: 'Agricultural Production & Silo Handling',
        participantCategories: ['agricultural_producer', 'commodity_supplier'],
        verificationLevel: 4,
        verificationSummary:
          'Cooperative registration and commercial silo capacity documentation reviewed.',
        corridors: ['SA', 'GLOBAL'],
        isDemo: true,
        createdAt: '2026-10-01T08:00:00Z',
        documents: [
          {
            id: 'doc_5',
            type: 'facility_evidence',
            title: 'SAGIS Registered Silo Allocation Proof',
            referenceNumber: 'SAGIS-FS-2219',
            status: 'verified',
            submittedAt: '2026-10-02T09:00:00Z',
            reviewedAt: '2026-10-03T11:00:00Z',
          },
        ],
      },
      {
        id: 'biz_lusaka_cu',
        name: 'Copperbelt Cathode Exports Ltd',
        country: 'Zambia',
        city: 'Kitwe',
        registrationNumber: '120180009412',
        website: 'https://copperbeltcathodes.example.zm',
        address: 'Plot 212 Mindolo Industrial Area, Kitwe',
        industry: 'Refined Metals Trading & Export',
        participantCategories: ['processor_smelter', 'commodity_supplier', 'manufacturer_exporter'],
        verificationLevel: 4,
        verificationSummary:
          'PACRA registration and Durban bonded warehouse dispatch history reviewed.',
        corridors: ['GLOBAL', 'CN-ZA', 'SA'],
        isDemo: true,
        createdAt: '2026-10-05T10:00:00Z',
        documents: [],
      },
      {
        id: 'biz_meridian_broker',
        name: 'Meridian Corridor Trade Mandate (Pty) Ltd',
        country: 'South Africa',
        city: 'Durban, KwaZulu-Natal',
        registrationNumber: '2021/662109/07',
        website: 'https://meridiancorridor.example.co.za',
        address: 'Suite 904, Kingsmead Office Park, Durban 4001',
        industry: 'Mandated Commodity Brokerage & Trade Advisory',
        participantCategories: ['trader_broker', 'logistics_provider'],
        verificationLevel: 3,
        verificationSummary:
          'CIPC registration and disclosed principal mandate agreement reviewed. Operates strictly as intermediary.',
        corridors: ['CN-ZA', 'SA', 'GLOBAL'],
        isDemo: true,
        createdAt: '2026-10-09T11:00:00Z',
        documents: [
          {
            id: 'doc_6',
            type: 'agency_mandate',
            title: 'Non-Exclusive Export Mandate — Rustenburg Chrome Beneficiation',
            referenceNumber: 'MANDATE-2026-09',
            status: 'submitted',
            submittedAt: '2026-11-18T10:00:00Z',
          },
        ],
      },
      {
        id: 'biz_terra_ops',
        name: 'TerraExchange Trade Desk & Governance',
        country: 'South Africa',
        city: 'Cape Town, Western Cape',
        registrationNumber: '2025/001100/07',
        website: 'https://terraexchange.trade',
        address: '14 Bree Street, Cape Town 8001',
        industry: 'B2B Trade Facilitation & Verification Governance',
        participantCategories: ['trade_finance', 'inspection_provider'],
        verificationLevel: 6,
        verificationSummary: 'Internal TerraExchange Trade Desk and Platform Governance Entity.',
        corridors: ['SA', 'CN-ZA', 'GLOBAL'],
        isDemo: true,
        createdAt: '2026-09-01T08:00:00Z',
        documents: [],
      },
    ];

    const demoPassHash = hashPassword('TerraDemo#2026');
    this.users = [
      {
        id: 'usr_buyer_za',
        fullName: 'Thabo Mokoena',
        email: 'procurement@highveldalloy.example.co.za',
        phone: '+27 11 555 0142',
        businessId: 'biz_highveld',
        businessRole: 'procurement_manager',
        isDemo: true,
        createdAt: '2026-09-18T10:00:00Z',
        passwordHash: demoPassHash,
      },
      {
        id: 'usr_supplier_za',
        fullName: 'Annelize van der Merwe',
        email: 'exports@ncmanganese.example.co.za',
        phone: '+27 53 555 0199',
        businessId: 'biz_ncmc',
        businessRole: 'trading_manager',
        isDemo: true,
        createdAt: '2026-09-10T08:00:00Z',
        passwordHash: demoPassHash,
      },
      {
        id: 'usr_partner_cn',
        fullName: 'Li Wei (David Li)',
        email: 'trade@sinolink-industrial.example.cn',
        phone: '+86 532 5550 8821',
        businessId: 'biz_sinolink',
        businessRole: 'sales_representative',
        isDemo: true,
        createdAt: '2026-09-22T07:00:00Z',
        passwordHash: demoPassHash,
      },
      {
        id: 'usr_admin',
        fullName: 'Nomsa Khumalo',
        email: 'compliance@terraexchange.trade',
        phone: '+27 21 555 0100',
        businessId: 'biz_terra_ops',
        businessRole: 'platform_admin',
        isPlatformAdmin: true,
        isTradeDeskStaff: true,
        isDemo: true,
        createdAt: '2026-09-01T08:00:00Z',
        passwordHash: demoPassHash,
      },
    ];

    this.listings = [
      {
        id: 'lst_mn_01',
        type: 'supply',
        corridor: 'CN-ZA',
        status: 'active',
        businessId: 'biz_ncmc',
        businessName: 'Northern Cape Manganese Corp (Pty) Ltd',
        businessCountry: 'South Africa',
        verificationLevel: 6,
        commoditySlug: 'manganese-ore',
        commodityName: 'Manganese Ore',
        category: 'Ferrous Metals',
        title: 'Kalahari High-Grade Manganese Lump Ore (38.5% Mn)',
        description:
          'Direct-from-mine metallurgical manganese lump (10–75mm) stocked at Port Elizabeth & Richards Bay bulk terminals for Chinese and domestic ferroalloy smelters.',
        specifications: {
          grade: 'Medium Grade (37-42%)',
          mn_pct: 38.5,
          fe_pct: 14.2,
          sio2_pct: 6.4,
          p_pct: 0.038,
          moisture_pct: 2.5,
          particle_size: '10-75mm lump (85% min)',
        },
        quantity: 25000,
        unit: 'MT',
        minOrderQuantity: 2500,
        pricePerUnit: 196,
        currency: 'USD',
        originCountry: 'South Africa',
        actualLocation: 'Port Elizabeth Bulk Terminal, Eastern Cape',
        packaging: 'Bulk vessel load or 1.25 MT jumbo bags',
        incoterms: ['FOB Port Elizabeth', 'CIF Tianjin', 'EXW Kuruman'],
        availableDocuments: ['SGS Assay Report', 'Certificate of Origin', 'DMR Export Allocation'],
        sellerRole: 'producer_owner',
        intermediaryDisclosure: {isIntermediary: false},
        imageUrl: '/src/assets/images/commodity_manganese_1795680023554.jpg',
        isDemo: true,
        createdAt: '2026-11-12T08:30:00Z',
        updatedAt: '2026-11-24T10:00:00Z',
      },
      {
        id: 'lst_mach_02',
        type: 'supply',
        corridor: 'CN-ZA',
        status: 'active',
        businessId: 'biz_sinolink',
        businessName: 'SinoLink Heavy Machinery & Metals Co., Ltd',
        businessCountry: 'China',
        verificationLevel: 5,
        commoditySlug: 'ore-crushing-machinery',
        commodityName: 'Mineral Crushing & Screening Equipment',
        category: 'Machinery & Industrial Equipment',
        title: '250 TPH Modular Primary Jaw & Cone Crushing Plant (380V SA Spec)',
        description:
          'Complete skid-mounted primary jaw and secondary hydraulic cone crushing circuit built for South African 380V/50Hz industrial power grids, shipped from Qingdao to Durban.',
        specifications: {
          equipment_type: 'Jaw Crusher Line',
          throughput_tph: 250,
          power_kw: 265,
          voltage: '380V / 50Hz (SANS compliant)',
          warranty_months: 18,
        },
        quantity: 4,
        unit: 'Unit',
        minOrderQuantity: 1,
        pricePerUnit: 218000,
        currency: 'USD',
        originCountry: 'China',
        actualLocation: 'Qingdao Bonded Manufacturing Park, Shandong',
        packaging: '4x 40ft Flat Rack & High Cube Breakbulk',
        incoterms: ['FOB Qingdao', 'CIF Durban'],
        availableDocuments: ['ISO 9001 Certificate', 'Factory Test Video & Spec Sheet', 'CE / SABS Electrical Dossier'],
        sellerRole: 'manufacturer_exporter',
        intermediaryDisclosure: {isIntermediary: false},
        imageUrl: '/src/assets/images/commodity_machinery_1795680025419.jpg',
        isDemo: true,
        createdAt: '2026-11-14T09:15:00Z',
        updatedAt: '2026-11-23T15:20:00Z',
      },
      {
        id: 'lst_cu_03',
        type: 'supply',
        corridor: 'GLOBAL',
        status: 'active',
        businessId: 'biz_lusaka_cu',
        businessName: 'Copperbelt Cathode Exports Ltd',
        businessCountry: 'Zambia',
        verificationLevel: 4,
        commoditySlug: 'copper-cathodes',
        commodityName: 'Copper Cathodes',
        category: 'Base Metals',
        title: 'Electrolytic Copper Cathodes Grade A (99.99% Cu) — Ex-Durban Bonded',
        description:
          'Monthly contract or spot parcels of 99.99% Cu electrolytic cathodes cleared into Durban bonded warehouse for SADC or international sea freight.',
        specifications: {
          purity_pct: 99.99,
          grade: 'Grade A (LME Spec)',
          standards: 'ASTM B115 / BS EN 1978',
          dimensions: '914mm x 914mm x 12mm',
        },
        quantity: 1200,
        unit: 'MT',
        minOrderQuantity: 100,
        pricePerUnit: 9140,
        currency: 'USD',
        originCountry: 'Zambia',
        actualLocation: 'Durban Harbour Bonded Warehouse, South Africa',
        packaging: 'Steel-strapped bundles (~2.2 MT per pallet)',
        incoterms: ['EXW Durban Bonded', 'FOB Durban', 'CIF Shanghai'],
        availableDocuments: ['Certificate of Analysis', 'SADC Certificate of Origin', 'Warehouse Warrant'],
        sellerRole: 'manufacturer_exporter',
        intermediaryDisclosure: {isIntermediary: false},
        imageUrl: '/src/assets/images/commodity_copper_1795680024616.jpg',
        isDemo: true,
        createdAt: '2026-11-15T11:00:00Z',
        updatedAt: '2026-11-24T09:00:00Z',
      },
      {
        id: 'lst_maize_04',
        type: 'supply',
        corridor: 'SA',
        status: 'active',
        businessId: 'biz_freestate',
        businessName: 'Vaalharts Grain & Agro Cooperative',
        businessCountry: 'South Africa',
        verificationLevel: 4,
        commoditySlug: 'yellow-maize',
        commodityName: 'Yellow & White Maize',
        category: 'Agricultural Commodities',
        title: 'Grade YM1 Non-GMO Yellow Maize — Bulk Silo Allocation',
        description:
          'Export and domestic milling grade YM1 yellow maize stored in SAGIS-registered Free State silos with rail siding and road bulk loading.',
        specifications: {
          grade: 'YM1',
          moisture_pct: 12.1,
          foreign_matter_pct: 0.7,
          crop_year: '2025/2026',
          gmo_status: 'Non-GMO',
        },
        quantity: 8500,
        unit: 'MT',
        minOrderQuantity: 250,
        pricePerUnit: 4320,
        currency: 'ZAR',
        originCountry: 'South Africa',
        actualLocation: 'Bloemfontein Silo Complex, Free State',
        packaging: 'Bulk tipper/rail or 50kg woven PP bags',
        incoterms: ['EXW Free State Silo', 'DAP Gauteng Mill', 'FOB Durban'],
        availableDocuments: ['SAGIS Silo Certificate', 'Phytosanitary Pre-Clearance', 'Moisture Lab Certificate'],
        sellerRole: 'producer_owner',
        intermediaryDisclosure: {isIntermediary: false},
        imageUrl: '/src/assets/images/commodity_maize_1795680025348.jpg',
        isDemo: true,
        createdAt: '2026-11-16T07:45:00Z',
        updatedAt: '2026-11-24T12:15:00Z',
      },
      {
        id: 'lst_chrome_05',
        type: 'supply',
        corridor: 'CN-ZA',
        status: 'active',
        businessId: 'biz_meridian_broker',
        businessName: 'Meridian Corridor Trade Mandate (Pty) Ltd',
        businessCountry: 'South Africa',
        verificationLevel: 3,
        commoditySlug: 'chrome-concentrate',
        commodityName: 'Chrome Ore Concentrate',
        category: 'Industrial Minerals',
        title: 'UG2 Chrome Concentrate (41.5% Cr2O3) — Mandated Intermediary Offer',
        description:
          'Mandated intermediary allocation from Rustenburg beneficiation plant. Full principal disclosure provided upon qualified buyer NDA and POF.',
        specifications: {
          cr2o3_pct: 41.5,
          cr_fe_ratio: '1.34:1',
          sio2_pct: 4.2,
          moisture_pct: 5.5,
        },
        quantity: 10000,
        unit: 'MT',
        minOrderQuantity: 2000,
        pricePerUnit: 245,
        currency: 'USD',
        originCountry: 'South Africa',
        actualLocation: 'Rustenburg Rail Siding / Richards Bay',
        packaging: 'Bulk or 1 MT bulk bags',
        incoterms: ['FOB Richards Bay', 'CIF Qinzhou'],
        availableDocuments: ['Mandate Authorization Letter', 'Plant Assay Summary'],
        sellerRole: 'mandated_intermediary',
        intermediaryDisclosure: {
          isIntermediary: true,
          principalName: 'Rustenburg Chrome Beneficiation (Pty) Ltd (Disclosed on NDA)',
          holdsValidMandate: true,
          feeStructure: 'USD 4.00 / MT Seller-Side Commission',
          negotiationAuthority: 'full_mandate',
        },
        imageUrl: '/src/assets/images/commodity_manganese_1795680023554.jpg',
        isDemo: true,
        createdAt: '2026-11-18T14:00:00Z',
        updatedAt: '2026-11-24T08:00:00Z',
      },
      {
        id: 'lst_demand_06',
        type: 'demand',
        corridor: 'CN-ZA',
        status: 'active',
        businessId: 'biz_sinolink',
        businessName: 'SinoLink Heavy Machinery & Metals Co., Ltd',
        businessCountry: 'China',
        verificationLevel: 5,
        commoditySlug: 'manganese-ore',
        commodityName: 'Manganese Ore',
        category: 'Ferrous Metals',
        title: 'Buyer Requirement: 15,000 MT Monthly Manganese Ore (36%–40% Mn) CIF Tianjin',
        description:
          'Direct steelmaking raw-material procurement for Q1–Q2 vessel schedules into Tianjin Xingang Port. LC at sight or irrevocable SBLC terms.',
        specifications: {
          grade: 'Medium Grade (37-42%)',
          mn_pct: 37.5,
          fe_pct: 15.0,
          particle_size: '10-75mm lump',
        },
        quantity: 15000,
        unit: 'MT',
        minOrderQuantity: 5000,
        pricePerUnit: 215,
        currency: 'USD',
        originCountry: 'South Africa',
        actualLocation: 'Tianjin Xingang Port, China',
        deliveryDestination: 'Tianjin Xingang Port, China',
        requiredDeliveryDate: '2027-01-20',
        packaging: 'Bulk carrier shipment',
        incoterms: ['CIF Tianjin', 'FOB Port Elizabeth'],
        availableDocuments: ['Irrevocable LC Draft Template'],
        sellerRole: 'industrial_buyer',
        intermediaryDisclosure: {isIntermediary: false},
        isDemo: true,
        createdAt: '2026-11-19T06:00:00Z',
        updatedAt: '2026-11-24T11:30:00Z',
      },
      {
        id: 'lst_demand_07',
        type: 'demand',
        corridor: 'SA',
        status: 'active',
        businessId: 'biz_highveld',
        businessName: 'Highveld Alloy & Industrial Procurement (Pty) Ltd',
        businessCountry: 'South Africa',
        verificationLevel: 5,
        commoditySlug: 'ore-crushing-machinery',
        commodityName: 'Mineral Crushing & Screening Equipment',
        category: 'Machinery & Industrial Equipment',
        title: 'Procurement Requirement: 200–250 TPH Secondary Cone & Jaw Crushing Plant',
        description:
          'Seeking OEM manufacturers in China or local SA stockists for turnkey manganese/chrome ore sizing plant delivered to Middelburg, Mpumalanga.',
        specifications: {
          equipment_type: 'Jaw Crusher Line',
          throughput_tph: 220,
          voltage: '380V / 50Hz',
        },
        quantity: 1,
        unit: 'Unit',
        minOrderQuantity: 1,
        pricePerUnit: 240000,
        currency: 'USD',
        originCountry: 'China',
        actualLocation: 'Middelburg Industrial Zone, South Africa',
        deliveryDestination: 'Durban Port / Middelburg Site',
        requiredDeliveryDate: '2027-02-15',
        packaging: 'Containerized / Breakbulk export',
        incoterms: ['CIF Durban', 'DDP Middelburg'],
        availableDocuments: ['Technical Site Spec Sheet'],
        sellerRole: 'industrial_buyer',
        intermediaryDisclosure: {isIntermediary: false},
        isDemo: true,
        createdAt: '2026-11-20T09:00:00Z',
        updatedAt: '2026-11-24T13:00:00Z',
      },
    ];

    this.rfqs = [
      {
        id: 'rfq_101',
        referenceCode: 'RFQ-CNZA-2026-101',
        buyerBusinessId: 'biz_highveld',
        buyerBusinessName: 'Highveld Alloy & Industrial Procurement (Pty) Ltd',
        buyerCountry: 'South Africa',
        corridor: 'CN-ZA',
        commoditySlug: 'ore-crushing-machinery',
        commodityName: 'Mineral Crushing & Screening Equipment',
        title: 'Turnkey 250 TPH Crushing & Screening Circuit (Middelburg Smelter Yard)',
        specifications: {
          equipment_type: 'Jaw Crusher Line',
          throughput_tph: 250,
          power_kw: 265,
          voltage: '380V / 50Hz (SA Grid)',
        },
        quantity: 1,
        unit: 'Unit',
        destinationPortOrCity: 'Durban Port / Middelburg, SA',
        preferredOrigin: 'China or South Africa',
        incotermPreference: 'CIF Durban',
        targetBudgetPerUnit: 225000,
        currency: 'USD',
        responseDeadline: '2026-12-18',
        requiredCertifications: ['ISO 9001', 'Electrical 380V/50Hz Compliance', '18-Month OEM Warranty'],
        invitedBusinessIds: ['biz_sinolink'],
        openToMatchingSuppliers: true,
        linkedListingId: 'lst_mach_02',
        status: 'under_evaluation',
        notes: 'Must include spare wear liners for 12 months and commissioning supervision.',
        isDemo: true,
        createdAt: '2026-11-20T10:30:00Z',
      },
      {
        id: 'rfq_102',
        referenceCode: 'RFQ-CNZA-2026-102',
        buyerBusinessId: 'biz_sinolink',
        buyerBusinessName: 'SinoLink Heavy Machinery & Metals Co., Ltd',
        buyerCountry: 'China',
        corridor: 'CN-ZA',
        commoditySlug: 'manganese-ore',
        commodityName: 'Manganese Ore',
        title: '10,000 MT Metallurgical Manganese Lump (Min 38% Mn) — Q1 Vessel',
        specifications: {
          grade: 'Medium Grade (37-42%)',
          mn_pct: 38.0,
          fe_pct: 14.5,
          particle_size: '10-75mm lump',
        },
        quantity: 10000,
        unit: 'MT',
        destinationPortOrCity: 'Tianjin Xingang Port, China',
        preferredOrigin: 'South Africa',
        incotermPreference: 'FOB Port Elizabeth',
        targetBudgetPerUnit: 202,
        currency: 'USD',
        responseDeadline: '2026-12-12',
        requiredCertifications: ['SGS Pre-Shipment Assay', 'Certificate of Origin'],
        invitedBusinessIds: ['biz_ncmc'],
        openToMatchingSuppliers: true,
        linkedListingId: 'lst_mn_01',
        status: 'open',
        notes: 'Inspection by SGS at loading port mandatory. LC at sight via Bank of China.',
        isDemo: true,
        createdAt: '2026-11-21T07:00:00Z',
      },
    ];

    this.quotations = [
      {
        id: 'quo_201',
        rfqId: 'rfq_101',
        supplierBusinessId: 'biz_sinolink',
        supplierBusinessName: 'SinoLink Heavy Machinery & Metals Co., Ltd',
        supplierCountry: 'China',
        supplierVerificationLevel: 5,
        sellerRole: 'manufacturer_exporter',
        intermediaryDisclosure: {isIntermediary: false},
        pricePerUnit: 214500,
        currency: 'USD',
        minimumQuantity: 1,
        unit: 'Unit',
        incoterm: 'CIF Durban',
        originLocation: 'Qingdao Port, China',
        estimatedLeadTimeDays: 42,
        validityDate: '2026-12-20',
        attachedDocuments: ['Technical GA Drawing PDF', 'ISO 9001 Certificate', '12-Month Spare Parts List'],
        technicalNotes:
          'Includes 380V/50Hz Siemens control cabinet, 1 set manganese jaw plates, and 14-day remote + on-site commissioning engineer support.',
        status: 'shortlisted',
        createdAt: '2026-11-22T09:00:00Z',
        updatedAt: '2026-11-23T11:00:00Z',
      },
      {
        id: 'quo_202',
        rfqId: 'rfq_102',
        supplierBusinessId: 'biz_ncmc',
        supplierBusinessName: 'Northern Cape Manganese Corp (Pty) Ltd',
        supplierCountry: 'South Africa',
        supplierVerificationLevel: 6,
        sellerRole: 'producer_owner',
        intermediaryDisclosure: {isIntermediary: false},
        pricePerUnit: 196,
        currency: 'USD',
        minimumQuantity: 5000,
        unit: 'MT',
        incoterm: 'FOB Port Elizabeth',
        originLocation: 'Port Elizabeth Bulk Terminal',
        estimatedLeadTimeDays: 18,
        validityDate: '2026-12-15',
        attachedDocuments: ['SGS Lot Assay 38.5% Mn', 'DMR Export Allocation'],
        technicalNotes:
          'Firm allocation of 10,000 MT ready at Port Elizabeth stack. SGS draft survey and chemical sampling at load port included.',
        status: 'submitted',
        createdAt: '2026-11-22T14:20:00Z',
        updatedAt: '2026-11-22T14:20:00Z',
      },
    ];

    this.conversations = [
      {
        id: 'conv_01',
        subject: 'RFQ-CNZA-2026-101 — Crushing Plant 380V Spec & Durban CIF',
        participantBusinessIds: ['biz_highveld', 'biz_sinolink'],
        participantBusinessNames: [
          'Highveld Alloy & Industrial Procurement (Pty) Ltd',
          'SinoLink Heavy Machinery & Metals Co., Ltd',
        ],
        linkedRfqId: 'rfq_101',
        linkedRfqCode: 'RFQ-CNZA-2026-101',
        linkedListingId: 'lst_mach_02',
        linkedListingTitle: '250 TPH Modular Primary Jaw & Cone Crushing Plant (380V SA Spec)',
        updatedAt: '2026-11-24T09:30:00Z',
        messages: [
          {
            id: 'msg_1',
            senderUserId: 'usr_buyer_za',
            senderName: 'Thabo Mokoena',
            senderBusinessId: 'biz_highveld',
            senderBusinessName: 'Highveld Alloy & Industrial Procurement (Pty) Ltd',
            body: 'We reviewed your shortlisted CIF Durban quotation of USD 214,500. Can you confirm the HS tariff code for our clearing agent and whether the jaw plates are Mn18Cr2?',
            createdAt: '2026-11-23T14:15:00Z',
            readByRecipient: true,
          },
          {
            id: 'msg_2',
            senderUserId: 'usr_partner_cn',
            senderName: 'Li Wei (David Li)',
            senderBusinessId: 'biz_sinolink',
            senderBusinessName: 'SinoLink Heavy Machinery & Metals Co., Ltd',
            body: 'Confirmed: wear liners are Mn18Cr2 alloy casting. Reference HS code on our commercial invoice is 8474.20 (subject to your SA clearing broker verification). Packing list and GA drawing are ready for inspection.',
            attachmentName: 'SinoLink_250TPH_GA_Spec.pdf',
            createdAt: '2026-11-24T09:30:00Z',
            readByRecipient: false,
          },
        ],
      },
      {
        id: 'conv_02',
        subject: 'Kalahari Manganese 38.5% Mn — Q1 Vessel Laycan Enquiry',
        participantBusinessIds: ['biz_sinolink', 'biz_ncmc'],
        participantBusinessNames: [
          'SinoLink Heavy Machinery & Metals Co., Ltd',
          'Northern Cape Manganese Corp (Pty) Ltd',
        ],
        linkedRfqId: 'rfq_102',
        linkedRfqCode: 'RFQ-CNZA-2026-102',
        linkedListingId: 'lst_mn_01',
        linkedListingTitle: 'Kalahari High-Grade Manganese Lump Ore (38.5% Mn)',
        updatedAt: '2026-11-24T11:10:00Z',
        messages: [
          {
            id: 'msg_3',
            senderUserId: 'usr_supplier_za',
            senderName: 'Annelize van der Merwe',
            senderBusinessId: 'biz_ncmc',
            senderBusinessName: 'Northern Cape Manganese Corp (Pty) Ltd',
            body: 'Our 10,000 MT lot at Port Elizabeth has been assayed by SGS at 38.5% Mn and 14.2% Fe. We can accommodate a Jan 10–18 vessel laycan under FOB Port Elizabeth.',
            attachmentName: 'SGS_PE_Lot_Assay_2026.pdf',
            createdAt: '2026-11-24T11:10:00Z',
            readByRecipient: false,
          },
        ],
      },
    ];

    this.opportunities = [
      {
        id: 'opp_01',
        title: 'Annual Offtake Mandate: 120,000 MT South African Manganese Ore to North China',
        corridor: 'CN-ZA',
        opportunityType: 'offtake_contract',
        commodityName: 'Manganese Ore',
        commoditySlug: 'manganese-ore',
        origin: 'Port Elizabeth / Richards Bay, South Africa',
        destination: 'Tianjin / Qinzhou, China',
        volumeSummary: '10,000 MT/month x 12 months',
        indicativeValueSummary: 'USD 23.5M indicative annual contract volume',
        leadBusinessId: 'biz_ncmc',
        leadBusinessName: 'Northern Cape Manganese Corp (Pty) Ltd',
        verificationLevel: 6,
        summary:
          'Direct producer allocation seeking verified Chinese ferroalloy smelters or bonded port stockists for 12-month structured FOB/CIF parcels.',
        requirements: ['Verified corporate importer / smelter', 'Irrevocable LC from top-tier bank', 'SGS load-port inspection'],
        isDemo: true,
        publishedAt: '2026-11-18T09:00:00Z',
      },
      {
        id: 'opp_02',
        title: 'SA Mining Capex Sourcing: Chinese Crushing & Beneficiation Lines (380V)',
        corridor: 'CN-ZA',
        opportunityType: 'import_sourcing',
        commodityName: 'Mineral Crushing & Screening Equipment',
        commoditySlug: 'ore-crushing-machinery',
        origin: 'Qingdao / Shanghai, China',
        destination: 'Mpumalanga & Northern Cape, South Africa',
        volumeSummary: '3 modular plants (150–300 TPH)',
        indicativeValueSummary: 'USD 650,000 – 820,000 combined capex',
        leadBusinessId: 'biz_highveld',
        leadBusinessName: 'Highveld Alloy & Industrial Procurement (Pty) Ltd',
        verificationLevel: 5,
        summary:
          'Procurement consortium seeking OEM Chinese equipment exporters with proven SADC installations and local spares support.',
        requirements: ['ISO 9001 OEM manufacturer', '380V/50Hz SA compliance', 'Detailed CIF Durban quotation'],
        isDemo: true,
        publishedAt: '2026-11-20T12:00:00Z',
      },
      {
        id: 'opp_03',
        title: 'SADC Copper Cathode Corridor: Durban Bonded to East Asia & EU',
        corridor: 'GLOBAL',
        opportunityType: 'export_mandate',
        commodityName: 'Copper Cathodes',
        commoditySlug: 'copper-cathodes',
        origin: 'Kitwe, Zambia (via Durban Bonded)',
        destination: 'Shanghai / Rotterdam',
        volumeSummary: '500–1,200 MT spot & quarterly',
        indicativeValueSummary: 'USD 4.5M – 10.9M per parcel',
        leadBusinessId: 'biz_lusaka_cu',
        leadBusinessName: 'Copperbelt Cathode Exports Ltd',
        verificationLevel: 4,
        summary:
          'Cleared Grade A copper cathodes positioned in Durban bonded storage for rapid ocean dispatch.',
        requirements: ['KYB verified buyer', 'Inspection at Durban bonded warehouse'],
        isDemo: true,
        publishedAt: '2026-11-21T15:00:00Z',
      },
    ];

    this.tradeDeskDeals = [
      {
        id: 'td_01',
        referenceCode: 'TD-2026-041',
        title: 'Highveld Alloy ↔ SinoLink 250 TPH Crushing Plant',
        corridor: 'CN-ZA',
        commodityName: 'Mineral Crushing & Screening Equipment',
        commoditySlug: 'ore-crushing-machinery',
        buyerBusinessName: 'Highveld Alloy & Industrial Procurement (Pty) Ltd',
        buyerBusinessId: 'biz_highveld',
        supplierBusinessName: 'SinoLink Heavy Machinery & Metals Co., Ltd',
        supplierBusinessId: 'biz_sinolink',
        estimatedValueUsd: 214500,
        quantity: 1,
        unit: 'Unit',
        commissionEstimateUsd: 6435,
        stage: 'negotiation',
        assignedOfficer: 'Nomsa Khumalo',
        linkedRfqId: 'rfq_101',
        lastContactNote: 'Buyer requested Mn18Cr2 liner verification and HS 8474.20 landed cost review.',
        nextFollowUpDate: '2026-11-28',
        updatedAt: '2026-11-24T10:15:00Z',
      },
      {
        id: 'td_02',
        referenceCode: 'TD-2026-042',
        title: 'SinoLink Metals ↔ Northern Cape Manganese 10,000 MT Parcel',
        corridor: 'CN-ZA',
        commodityName: 'Manganese Ore',
        commoditySlug: 'manganese-ore',
        buyerBusinessName: 'SinoLink Heavy Machinery & Metals Co., Ltd',
        buyerBusinessId: 'biz_sinolink',
        supplierBusinessName: 'Northern Cape Manganese Corp (Pty) Ltd',
        supplierBusinessId: 'biz_ncmc',
        estimatedValueUsd: 1960000,
        quantity: 10000,
        unit: 'MT',
        commissionEstimateUsd: 19600,
        stage: 'quotation_received',
        assignedOfficer: 'Nomsa Khumalo',
        linkedRfqId: 'rfq_102',
        lastContactNote: 'NCMC submitted USD 196/MT FOB Port Elizabeth. Awaiting buyer laycan confirmation.',
        nextFollowUpDate: '2026-11-27',
        updatedAt: '2026-11-23T16:40:00Z',
      },
      {
        id: 'td_03',
        referenceCode: 'TD-2026-043',
        title: 'Gauteng Milling Group ↔ Vaalharts Grain 3,000 MT YM1 Maize',
        corridor: 'SA',
        commodityName: 'Yellow & White Maize',
        commoditySlug: 'yellow-maize',
        buyerBusinessName: 'Randfontein Maize Millers (Prospective Lead)',
        supplierBusinessName: 'Vaalharts Grain & Agro Cooperative',
        supplierBusinessId: 'biz_freestate',
        estimatedValueUsd: 712000,
        quantity: 3000,
        unit: 'MT',
        commissionEstimateUsd: 7120,
        stage: 'requirement_confirmed',
        assignedOfficer: 'Nomsa Khumalo',
        lastContactNote: 'Mill procurement confirmed monthly 1,000 MT drawdowns; preparing RFQ invitation.',
        nextFollowUpDate: '2026-11-29',
        updatedAt: '2026-11-24T08:20:00Z',
      },
      {
        id: 'td_04',
        referenceCode: 'TD-2026-044',
        title: 'Ningbo Power Rods ↔ Copperbelt Cathodes 500 MT',
        corridor: 'GLOBAL',
        commodityName: 'Copper Cathodes',
        commoditySlug: 'copper-cathodes',
        buyerBusinessName: 'Ningbo Conductors Industrial Co.',
        supplierBusinessName: 'Copperbelt Cathode Exports Ltd',
        supplierBusinessId: 'biz_lusaka_cu',
        estimatedValueUsd: 4570000,
        quantity: 500,
        unit: 'MT',
        commissionEstimateUsd: 22850,
        stage: 'qualified',
        assignedOfficer: 'Nomsa Khumalo',
        lastContactNote: 'KYB documents requested from Ningbo Conductors prior to Durban warehouse inspection.',
        nextFollowUpDate: '2026-12-01',
        updatedAt: '2026-11-24T11:00:00Z',
      },
    ];

    this.auditLogs = [
      {
        id: 'aud_01',
        actorUserId: 'usr_admin',
        actorName: 'Nomsa Khumalo',
        actorBusinessId: 'biz_terra_ops',
        action: 'VERIFICATION_APPROVED',
        entityType: 'business',
        entityId: 'biz_ncmc',
        summary: 'Approved Level 6 Enhanced Verification for Northern Cape Manganese Corp (SGS & CIPC verified).',
        timestamp: '2026-11-20T14:20:00Z',
      },
      {
        id: 'aud_02',
        actorUserId: 'usr_buyer_za',
        actorName: 'Thabo Mokoena',
        actorBusinessId: 'biz_highveld',
        action: 'QUOTATION_SHORTLISTED',
        entityType: 'quotation',
        entityId: 'quo_201',
        summary: 'Shortlisted quotation QUO-201 from SinoLink Heavy Machinery for RFQ-CNZA-2026-101.',
        timestamp: '2026-11-23T11:00:00Z',
      },
      {
        id: 'aud_03',
        actorUserId: 'usr_supplier_za',
        actorName: 'Annelize van der Merwe',
        actorBusinessId: 'biz_ncmc',
        action: 'QUOTATION_SUBMITTED',
        entityType: 'quotation',
        entityId: 'quo_202',
        summary: 'Submitted USD 196/MT FOB Port Elizabeth quotation on RFQ-CNZA-2026-102.',
        timestamp: '2026-11-22T14:20:00Z',
      },
    ];
  }
}

export const db = new TerraExchangeStore();
