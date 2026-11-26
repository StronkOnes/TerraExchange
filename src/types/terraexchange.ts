export type BusinessRole =
  | 'business_owner'
  | 'administrator'
  | 'procurement_manager'
  | 'sales_representative'
  | 'trading_manager'
  | 'finance_officer'
  | 'operations_manager'
  | 'trade_desk_officer'
  | 'platform_admin';

export type ParticipantCategory =
  | 'mine_producer'
  | 'agricultural_producer'
  | 'manufacturer_exporter'
  | 'commodity_supplier'
  | 'importer_wholesaler'
  | 'trader_broker'
  | 'processor_smelter'
  | 'industrial_buyer'
  | 'logistics_provider'
  | 'inspection_provider'
  | 'trade_finance';

export type VerificationLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type MarketplaceCorridor = 'SA' | 'GLOBAL' | 'CN-ZA';

export type CommodityCategory =
  | 'Precious Metals'
  | 'Base Metals'
  | 'Ferrous Metals'
  | 'Battery Minerals'
  | 'Industrial Minerals'
  | 'Agricultural Commodities'
  | 'Food & Agroprocessed'
  | 'Energy Commodities'
  | 'Fertilisers'
  | 'Industrial Chemicals'
  | 'Forestry Products'
  | 'Recyclable Materials'
  | 'Industrial Raw Materials'
  | 'Machinery & Industrial Equipment'
  | 'Components & Manufactured Goods';

export interface SpecFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  unit?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface CommodityTemplate {
  id: string;
  slug: string;
  name: string;
  category: CommodityCategory;
  hsCodeReference: string;
  defaultUnit: string;
  description: string;
  primaryCorridors: MarketplaceCorridor[];
  specFields: SpecFieldDefinition[];
  imageUrl?: string;
}

export interface VerificationDocument {
  id: string;
  type:
    | 'company_registration'
    | 'tax_clearance'
    | 'export_import_permit'
    | 'product_certificate'
    | 'assay_quality_report'
    | 'origin_certificate'
    | 'facility_evidence'
    | 'agency_mandate';
  title: string;
  referenceNumber: string;
  status: 'submitted' | 'reviewed' | 'verified' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
}

export interface BusinessAccount {
  id: string;
  name: string;
  country: string;
  city: string;
  registrationNumber: string;
  taxNumber?: string;
  website: string;
  address: string;
  industry: string;
  participantCategories: ParticipantCategory[];
  verificationLevel: VerificationLevel;
  verificationSummary: string;
  corridors: MarketplaceCorridor[];
  documents: VerificationDocument[];
  isDemo?: boolean;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  businessId: string;
  businessRole: BusinessRole;
  isPlatformAdmin?: boolean;
  isTradeDeskStaff?: boolean;
  isDemo?: boolean;
  createdAt: string;
}

export type ListingType = 'supply' | 'demand';

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'fulfilled'
  | 'expired';

export type SellerDisclosureRole =
  | 'producer_owner'
  | 'manufacturer_exporter'
  | 'stockist_supplier'
  | 'industrial_buyer'
  | 'mandated_intermediary'
  | 'broker';

export interface IntermediaryDisclosure {
  isIntermediary: boolean;
  principalName?: string;
  holdsValidMandate?: boolean;
  feeStructure?: string;
  negotiationAuthority?: 'full_mandate' | 'introduction_only' | 'non_exclusive_broker';
}

export interface MarketplaceListing {
  id: string;
  type: ListingType;
  corridor: MarketplaceCorridor;
  status: ListingStatus;
  businessId: string;
  businessName: string;
  businessCountry: string;
  verificationLevel: VerificationLevel;
  commoditySlug: string;
  commodityName: string;
  category: CommodityCategory;
  title: string;
  description: string;
  specifications: Record<string, string | number>;
  quantity: number;
  unit: string;
  minOrderQuantity: number;
  pricePerUnit: number | null; // null means Price on Request
  currency: 'USD' | 'ZAR' | 'CNY' | 'EUR';
  originCountry: string;
  actualLocation: string;
  deliveryDestination?: string;
  requiredDeliveryDate?: string;
  packaging: string;
  incoterms: string[];
  availableDocuments: string[];
  sellerRole: SellerDisclosureRole;
  intermediaryDisclosure: IntermediaryDisclosure;
  imageUrl?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RfqStatus =
  | 'draft'
  | 'open'
  | 'under_evaluation'
  | 'shortlisted'
  | 'awarded'
  | 'closed';

export interface RfqRecord {
  id: string;
  referenceCode: string;
  buyerBusinessId: string;
  buyerBusinessName: string;
  buyerCountry: string;
  corridor: MarketplaceCorridor;
  commoditySlug: string;
  commodityName: string;
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
  invitedBusinessIds: string[];
  openToMatchingSuppliers: boolean;
  linkedListingId?: string;
  status: RfqStatus;
  notes: string;
  isDemo?: boolean;
  createdAt: string;
}

export type QuotationStatus =
  | 'submitted'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface QuotationRecord {
  id: string;
  rfqId: string;
  supplierBusinessId: string;
  supplierBusinessName: string;
  supplierCountry: string;
  supplierVerificationLevel: VerificationLevel;
  sellerRole: SellerDisclosureRole;
  intermediaryDisclosure: IntermediaryDisclosure;
  pricePerUnit: number;
  currency: 'USD' | 'ZAR' | 'CNY' | 'EUR';
  minimumQuantity: number;
  unit: string;
  incoterm: string;
  originLocation: string;
  estimatedLeadTimeDays: number;
  validityDate: string;
  attachedDocuments: string[];
  technicalNotes: string;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRecommendation {
  id: string;
  supplyListingId: string;
  supplyTitle: string;
  supplierBusinessId: string;
  supplierName: string;
  supplierCountry: string;
  supplierVerificationLevel: VerificationLevel;
  commodityName: string;
  corridor: MarketplaceCorridor;
  score: number;
  reasons: string[];
  pricePerUnit: number | null;
  currency: string;
  quantityAvailable: number;
  unit: string;
  incoterms: string[];
}

export interface ConversationMessage {
  id: string;
  senderUserId: string;
  senderName: string;
  senderBusinessId: string;
  senderBusinessName: string;
  body: string;
  attachmentName?: string;
  createdAt: string;
  readByRecipient: boolean;
}

export interface ConversationThread {
  id: string;
  subject: string;
  participantBusinessIds: string[];
  participantBusinessNames: string[];
  linkedListingId?: string;
  linkedListingTitle?: string;
  linkedRfqId?: string;
  linkedRfqCode?: string;
  messages: ConversationMessage[];
  updatedAt: string;
}

export type TradeDeskStage =
  | 'research_lead'
  | 'contacted'
  | 'qualified'
  | 'requirement_confirmed'
  | 'supplier_matching'
  | 'rfq_issued'
  | 'quotation_received'
  | 'negotiation'
  | 'commercial_agreement'
  | 'completed'
  | 'lost';

export interface TradeDeskDeal {
  id: string;
  referenceCode: string;
  title: string;
  corridor: MarketplaceCorridor;
  commodityName: string;
  commoditySlug: string;
  buyerBusinessName: string;
  buyerBusinessId?: string;
  supplierBusinessName?: string;
  supplierBusinessId?: string;
  estimatedValueUsd: number;
  quantity: number;
  unit: string;
  commissionEstimateUsd: number;
  stage: TradeDeskStage;
  assignedOfficer: string;
  linkedRfqId?: string;
  lastContactNote: string;
  nextFollowUpDate: string;
  updatedAt: string;
}

export interface TradeOpportunity {
  id: string;
  title: string;
  corridor: MarketplaceCorridor;
  opportunityType: 'export_mandate' | 'import_sourcing' | 'offtake_contract' | 'logistics_corridor';
  commodityName: string;
  commoditySlug: string;
  origin: string;
  destination: string;
  volumeSummary: string;
  indicativeValueSummary: string;
  leadBusinessId: string;
  leadBusinessName: string;
  verificationLevel: VerificationLevel;
  summary: string;
  requirements: string[];
  isDemo?: boolean;
  publishedAt: string;
}

export interface LandedCostInput {
  corridor: 'CN-ZA' | 'GLOBAL-ZA' | 'ZA-EXPORT';
  commodityName: string;
  hsCode: string;
  quantity: number;
  unit: string;
  unitSupplierPrice: number;
  supplierCurrency: 'USD' | 'CNY' | 'EUR' | 'ZAR';
  exchangeRateToZar: number;
  incotermBase: 'FOB' | 'CIF' | 'EXW';
  oceanFreightTotalUsd: number;
  marineInsurancePct: number;
  customsDutyPct: number;
  importVatPct: number;
  portHandlingZar: number;
  customsClearanceZar: number;
  inlandHaulageZar: number;
  otherFeesZar: number;
}

export interface LandedCostBreakdown {
  input: LandedCostInput;
  goodsValueZar: number;
  freightZar: number;
  insuranceZar: number;
  cifCustomsValueZar: number;
  customsDutyZar: number;
  addedTaxValueAtvZar: number;
  importVatZar: number;
  portAndClearanceZar: number;
  inlandAndOtherZar: number;
  totalLandedCostZar: number;
  landedCostPerUnitZar: number;
  landedCostPerUnitUsd: number;
  disclaimer: string;
}

export interface AuditEvent {
  id: string;
  actorUserId: string;
  actorName: string;
  actorBusinessId: string;
  action: string;
  entityType: 'user' | 'business' | 'listing' | 'rfq' | 'quotation' | 'trade_desk' | 'verification';
  entityId: string;
  summary: string;
  timestamp: string;
}

export interface TradeIntelligencePayload {
  corridorMetrics: Array<{
    corridor: string;
    label: string;
    activeSupplyCount: number;
    activeDemandCount: number;
    openRfqCount: number;
    primaryPorts: string;
    notes: string;
    dataClassification: 'Platform Activity' | 'Reference Corridor Data';
  }>;
  commodityBenchmarks: Array<{
    commoditySlug: string;
    commodityName: string;
    referenceRange: string;
    unit: string;
    typicalIncoterm: string;
    corridorTrend: string;
    dataClassification: 'Indicative Estimate' | 'User-Submitted Supply Average';
  }>;
  complianceNotices: Array<{
    id: string;
    jurisdiction: string;
    commodityGroup: string;
    requirement: string;
  }>;
}
