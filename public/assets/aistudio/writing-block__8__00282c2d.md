# MASTER DEVELOPMENT PROMPT: TERRAEXCHANGE WEB APPLICATION AND MOBILE APPLICATION

## PROJECT OVERVIEW

You are a senior software architect, product designer, full-stack developer and mobile application engineer.

Your task is to design and develop **TerraExchange**, a professional international B2B commodities and physical-goods trading marketplace connecting legitimate commercial businesses across South Africa and international markets.

TerraExchange is not a consumer shopping platform, cryptocurrency exchange or financial trading platform. It is a business-to-business sourcing, procurement, supply discovery and trade facilitation network.

The platform must connect:

- Mines and mineral producers.
- Agricultural producers and cooperatives.
- Manufacturers and industrial companies.
- Commodity suppliers and stockists.
- Importers and exporters.
- Commodity traders and brokers.
- Processors, smelters and refineries.
- Industrial buyers and procurement departments.
- Wholesalers and distributors.
- Logistics and shipping companies.
- Inspection and certification providers.
- Trade finance and commercial service providers.

The platform must support two interconnected marketplace experiences:

1. **TerraExchange SA:** A marketplace focused on South African businesses, suppliers, buyers and domestic trade.
2. **TerraExchange Global:** An international marketplace connecting businesses across countries and trade corridors.

Both experiences must use the same underlying platform infrastructure, business identities, database, authentication, verification and marketplace engine.

The initial strategic focus must include the China–South Africa trade corridor, while ensuring that the architecture can support additional international trade corridors.

---

# PART 1 — GLOBAL DEVELOPMENT RULES

These rules apply to the entire project.

## 1.1 Separate the applications

Develop two distinct user-facing applications:

**Application A: TerraExchange Web**
- Desktop-first professional B2B marketplace.
- Responsive tablet and mobile-browser support.
- Optimised for research, procurement, listings, administration, negotiations and detailed business workflows.

**Application B: TerraExchange Mobile**
- Dedicated Android and iOS application.
- Designed specifically for mobile interaction.
- Optimised for notifications, communication, quick sourcing, RFQ management, listing management, document access and trade opportunity discovery.

IMPORTANT: Do not combine the two applications into one interface.

Do not use web-only components in the mobile application.

Do not simply shrink the website to fit a mobile screen.

Each application must have its own interface, navigation, layouts, reusable components and platform-specific interaction patterns.

They must, however, connect to the same backend and use the same business rules.

## 1.2 Shared backend

Both applications must communicate with one shared backend through a properly documented API.

The backend must manage:

- Authentication and authorisation.
- User accounts.
- Business profiles.
- Company verification.
- Supplier verification.
- Buyer verification.
- Commodity catalogue.
- Supply listings.
- Demand listings.
- RFQs.
- Supplier quotations.
- Buyer–supplier matching.
- Messaging.
- Notifications.
- Documents.
- Trade opportunities.
- Transaction records.
- Logistics information.
- Country and currency information.
- Administrative controls.
- Subscription and payment infrastructure.

Do not create separate databases for the web and mobile applications.

Do not duplicate business logic between the applications.

Implement business rules in the shared backend wherever possible.

## 1.3 Technology architecture

Use the following preferred architecture unless a compelling technical reason requires an alternative. Document any proposed deviation before implementing it.

**Web application**
- React.
- TypeScript.
- Vite.
- Material UI (MUI).
- Responsive layouts.
- React Router.
- TanStack Query or an equivalent server-state management solution.
- React Hook Form and appropriate validation.

**Mobile application**
- React Native.
- TypeScript.
- Expo.
- React Navigation or Expo Router.
- Native mobile components and platform-specific interaction patterns.
- Secure token storage.
- Push notification support.

**Backend**
- A modular backend architecture.
- REST API with documented endpoints.
- PostgreSQL database.
- Role-based access control.
- Object storage for documents and images.
- Real-time communication for messaging and relevant updates.
- API versioning.
- Centralised validation and business rules.

The web and mobile applications should share TypeScript types, API contracts, validation schemas and business logic where technically appropriate, but must not share presentation components that are incompatible across platforms.

## 1.4 Development principles

- Build functional software, not merely visual mock-ups.
- Avoid fake buttons and decorative functionality.
- Do not use hardcoded sample data as a substitute for backend integration.
- Clearly identify demo data where it is necessary.
- Build reusable, maintainable components.
- Use proper loading, empty, success and error states.
- Validate all user input.
- Implement secure permissions.
- Use realistic sample businesses and commodity records during development.
- Ensure the applications can grow without requiring a complete rewrite.
- Prioritise performance, accessibility and reliability.
- Do not build unnecessary complexity before the core marketplace works.

---

# PART 2 — SHARED TERRAEXCHANGE PLATFORM REQUIREMENTS

This section defines the functionality that both applications must support through the shared backend.

## 2.1 User registration and business accounts

Users must be able to register as individuals representing commercial businesses.

Registration should capture:

- Full name.
- Business email.
- Telephone number.
- Password or supported secure authentication method.
- Country.
- Business name.
- Business registration details where applicable.
- Business website.
- Business address.
- Business industry.
- Business role.

A business must be able to have multiple authorised users with different permissions.

Support business roles including:

- Business owner.
- Administrator.
- Procurement manager.
- Sales representative.
- Trading manager.
- Finance officer.
- Operations manager.

## 2.2 Business participant categories

The platform must support multiple participant types.

A company may occupy more than one role.

Examples:

- Manufacturer and exporter.
- Mine and mineral producer.
- Trader and distributor.
- Importer and wholesaler.
- Processor and buyer.
- Broker and commercial intermediary.
- Logistics provider.
- Inspection provider.

Do not force every company into one rigid category.

Users must declare their actual role when publishing a listing or participating in a trade opportunity.

Brokers and intermediaries must not be allowed to misrepresent themselves as the actual owner or producer of commodities.

Where applicable, they must disclose:

- Their intermediary status.
- The principal they represent.
- Whether they hold a valid mandate.
- Their commission or fee structure.
- Their authority to negotiate or facilitate a transaction.

## 2.3 Verification and trust

Create a structured verification system.

Verification levels should include:

1. Registered account.
2. Business identity submitted.
3. Business identity reviewed.
4. Additional operational verification.
5. Product or supply documentation reviewed.
6. Enhanced verification where appropriate.

Possible verification documents:

- Company registration certificates.
- Tax documentation.
- Export/import registrations.
- Product certificates.
- Technical specifications.
- Quality reports.
- Origin documentation.
- Export history.
- Factory or warehouse evidence.
- Authorisation or agency mandates.

Verification badges must accurately represent what has actually been checked.

Never imply that a company, product or commodity is guaranteed simply because an account is verified.

## 2.4 Commodity catalogue

Build a flexible international commodity catalogue.

Support the following categories:

- Precious metals.
- Base metals.
- Ferrous metals.
- Battery minerals.
- Industrial minerals.
- Agricultural commodities.
- Food and agroprocessed products.
- Energy commodities where legally permitted.
- Fertilisers.
- Industrial chemicals.
- Forestry products.
- Recyclable materials.
- Industrial raw materials.
- Machinery and industrial equipment.
- Components and manufactured goods.

Each commodity must support its own structured specification fields.

For example:

**Manganese ore**
- Grade.
- Mn percentage.
- Iron content.
- Silica.
- Phosphorus.
- Moisture.
- Particle size.
- Quantity.
- Origin.
- Packaging.
- Available delivery terms.

**Copper cathodes**
- Copper purity.
- Grade.
- Applicable standards.
- Quantity.
- Packaging.
- Origin.
- Delivery terms.

**Maize**
- Grade.
- Moisture.
- Foreign matter.
- Crop year.
- Quantity.
- Packaging.
- Origin.

Do not use one generic specification form for every commodity.

Create configurable commodity templates.

## 2.5 Marketplace modes

TerraExchange must have three connected marketplace modes.

**A. Supply Marketplace**

Businesses can advertise available physical commodities, goods and industrial products.

**B. Demand Marketplace**

Buyers can advertise what they need to purchase, including detailed specifications and volumes.

**C. Trade Opportunities**

Traders, brokers, manufacturers, suppliers and service providers can discover and facilitate commercial opportunities.

All three must connect to the same matching and RFQ infrastructure.

## 2.6 Listings

A supply listing should support:

- Product or commodity.
- Description.
- Technical specifications.
- Available quantity.
- Unit of measurement.
- Minimum order quantity.
- Indicative price or price-on-request.
- Currency.
- Country of origin.
- Actual location.
- Available documentation.
- Packaging.
- Delivery options.
- Incoterms where applicable.
- Availability status.
- Seller role.
- Verification status.

A demand listing should support:

- Required commodity.
- Required specifications.
- Quantity.
- Delivery destination.
- Required delivery date.
- Preferred origin.
- Target price or budget where appropriate.
- Payment preferences.
- Required certifications.
- Additional requirements.

Support listing statuses such as draft, pending review, active, paused, fulfilled and expired.

## 2.7 RFQ and quotation system

Build a complete Request for Quotation workflow.

A buyer must be able to:

1. Create a procurement requirement.
2. Enter commodity specifications.
3. Enter quantity and destination.
4. Set a response deadline.
5. Invite selected suppliers or allow matching suppliers to respond.
6. Receive quotations.
7. Compare quotations.
8. Ask questions.
9. Negotiate.
10. Accept, reject or shortlist offers.

Suppliers must be able to:

- Receive RFQs.
- Ask clarification questions.
- Submit quotations.
- Attach documents.
- Specify price and currency.
- Specify minimum quantities.
- Specify delivery terms.
- Provide estimated lead times.
- Update or withdraw quotations.

Track all important actions.

## 2.8 Buyer and supplier matching

Create a matching engine based on:

- Commodity compatibility.
- Technical specifications.
- Quantity and capacity.
- Origin and destination.
- Pricing.
- Delivery requirements.
- Certifications.
- Verification level.
- Availability.
- Logistics suitability.

Matching must not rely solely on keyword similarity.

The system should explain why a supplier is recommended.

## 2.9 Messaging and negotiation

Implement secure business-to-business messaging.

Features:

- One-to-one conversations.
- Conversations linked to listings.
- Conversations linked to RFQs.
- Conversations linked to quotations.
- Document sharing.
- Message timestamps.
- Read status.
- Notifications.
- Conversation history.
- Reporting and moderation.

## 2.10 Trade Desk CRM

Build a dedicated internal TerraExchange Trade Desk.

This is an important commercial component of the platform.

The Trade Desk must allow authorised staff to:

- Research potential buyers.
- Research potential suppliers.
- Create buyer and supplier records.
- Track procurement contacts.
- Record conversations.
- Record purchasing requirements.
- Create and manage RFQs.
- Match buyers and suppliers.
- Track quotations.
- Track negotiations.
- Record introductions.
- Monitor transaction progress.
- Manage follow-ups.
- Track fees and commissions where applicable.

Create an opportunity pipeline:

Research lead → Contacted → Qualified → Requirement confirmed → Supplier matching → RFQ issued → Quotation received → Negotiation → Commercial agreement → Completed / Lost.

## 2.11 Landed cost calculator

Create a landed cost calculator, particularly for Chinese imports into South Africa.

Support:

- Supplier price.
- Currency.
- Exchange rate.
- Freight.
- Insurance.
- Customs duty.
- Import VAT.
- Port and handling charges.
- Customs clearance.
- Inland transportation.
- Other applicable costs.

Calculations must use configurable assumptions and must clearly identify estimates.

Do not invent customs rates or assume a tariff classification is correct.

Provide a warning that final calculations require the correct HS classification, origin, valuation and applicable customs treatment.

## 2.12 International trade support

Support:

- Multiple countries.
- Multiple currencies.
- Country-specific business information.
- International telephone numbers.
- Time zones.
- Multiple languages in future.
- Incoterms.
- Import/export documentation.
- Shipping information.
- Country-specific compliance requirements.
- Country-specific restrictions and permits.

Do not assume every commodity can be traded in every country.

---

# PART 3 — APPLICATION A: TERRAEXCHANGE WEB

THIS SECTION APPLIES ONLY TO THE WEB APPLICATION.

Do not use these instructions to define the mobile application's interface.

## 3.1 Purpose

Build a premium, professional, desktop-first international B2B marketplace.

The website should feel like a serious international commercial platform used by procurement managers, industrial buyers, mining companies, commodity traders, manufacturers and exporters.

It should communicate:

- Trust.
- Commercial credibility.
- International reach.
- Professionalism.
- Efficiency.
- Transparency.
- Market intelligence.

Avoid the appearance of a generic online shopping template.

## 3.2 Web navigation

Create a clear main navigation system.

Suggested navigation:

- Home.
- Marketplace.
- Commodities.
- Buyers.
- Suppliers.
- RFQs.
- Trade Opportunities.
- Trade Intelligence.
- How It Works.
- About TerraExchange.

Provide separate authentication actions:

- Sign In.
- Register Business.

Once logged in, replace public navigation with an account dashboard.

## 3.3 Web homepage

Create a high-quality landing page with:

**Hero section**
- Strong TerraExchange identity.
- Clear explanation of the platform.
- Primary action: Explore Marketplace.
- Secondary action: Post a Requirement.
- Additional action: List Your Supply.

**Marketplace discovery**
- Search for commodities.
- Search for suppliers.
- Search for buyers.
- Search for RFQs.
- Search by country.

**Marketplace categories**
- Minerals and metals.
- Agriculture.
- Industrial materials.
- Energy.
- Chemicals.
- Machinery and equipment.
- Manufactured goods.

**Trade corridor section**
Highlight:
- China to South Africa.
- South Africa to China.
- South Africa to international markets.
- International sourcing opportunities.

**Featured opportunities**
Show real or clearly labelled demonstration listings.

**Trust and verification**
Explain how TerraExchange verifies businesses and supports more transparent commercial connections.

**How it works**
Explain the process for buyers, suppliers and intermediaries.

**Call to action**
Encourage businesses to register, list supply or publish procurement requirements.

## 3.4 Web marketplace interface

Create a sophisticated marketplace browsing experience.

Include:

- Search bar.
- Advanced filters.
- Category navigation.
- Country filters.
- Supplier filters.
- Verification filters.
- Price filters.
- Quantity filters.
- Availability filters.
- Listing type filters.

Use desktop-friendly layouts, including side filters and structured listing cards or tables where appropriate.

Provide sorting options:

- Recently listed.
- Price.
- Quantity.
- Relevance.
- Verification level.

## 3.5 Web business dashboard

Create a professional dashboard for registered businesses.

Include:

- Account overview.
- Business profile.
- Verification progress.
- Active listings.
- Saved listings.
- Active RFQs.
- Received quotations.
- Sent quotations.
- Messages.
- Trade opportunities.
- Recent activity.
- Notifications.
- Account settings.

Provide a dashboard that adapts to the user's business role and permissions.

## 3.6 Web listing management

Allow users to create, edit, duplicate, pause and close listings.

Use structured forms that adapt to the commodity selected.

Include document upload and preview.

Provide a listing preview before publication.

## 3.7 Web RFQ workspace

This must be one of the strongest sections of the web application.

Create a detailed procurement workspace where buyers can:

- Create procurement requirements.
- Manage multiple RFQs.
- Invite suppliers.
- View supplier responses.
- Compare offers side by side.
- Review technical specifications.
- Compare delivery terms.
- Compare indicative landed costs.
- Communicate with suppliers.
- Track procurement progress.

Supplier users should have an equally clear workspace for managing incoming RFQs and quotations.

## 3.8 Web trade intelligence

Create a professional trade intelligence area.

Support:

- Commodity market overview.
- Supply and demand indicators.
- Country trade statistics where reliable data is available.
- Import and export trends.
- Trade corridor information.
- Relevant commodity announcements.
- Procurement opportunities.
- Saved searches.
- Watchlists.

Clearly distinguish verified data from estimates, third-party information and user-submitted data.

Do not fabricate market prices, trade volumes or statistics.

## 3.9 Web administration

Build a separate protected administration interface.

Include:

- User management.
- Business verification.
- Listing moderation.
- Commodity catalogue management.
- Category management.
- RFQ oversight.
- Reports and complaints.
- Document review.
- Trade Desk CRM.
- Subscription management.
- Platform analytics.
- Audit logs.
- Configuration settings.

Administrators must have permissions based on their assigned roles.

## 3.10 Web design direction

Use a premium international trade aesthetic.

The visual identity should be professional, contemporary and restrained.

Suggested direction:

- Deep navy or charcoal foundations.
- Clean white and light neutral surfaces.
- Refined metallic or muted gold accents.
- Strong typography.
- Structured data presentation.
- Clear spacing.
- Subtle borders and shadows.
- Professional charts and dashboards.
- High-quality commodity photography where appropriate.

Use Material UI as the component foundation.

Do not overuse gradients, oversized cards, excessive animations or decorative elements.

The interface must prioritise usability and commercial information.

---

# PART 4 — APPLICATION B: TERRAEXCHANGE MOBILE

THIS SECTION APPLIES ONLY TO THE DEDICATED MOBILE APPLICATION.

Do not use the web application's layouts, navigation assumptions or desktop components here.

## 4.1 Purpose

Build a dedicated mobile application for Android and iOS.

The mobile application must provide access to the essential TerraExchange marketplace and business workflows while taking advantage of native mobile capabilities.

It must feel like a purpose-built business application rather than a website displayed inside a mobile shell.

## 4.2 Mobile design principles

Use:

- Native mobile navigation.
- Touch-friendly controls.
- Readable typography.
- Compact information presentation.
- Bottom tab navigation.
- Native modal and sheet patterns where appropriate.
- Fast loading.
- Minimal unnecessary steps.
- Secure local session management.
- Native push notifications.

Avoid:

- Desktop-style sidebars.
- Dense desktop tables.
- Tiny clickable controls.
- Hover-dependent functionality.
- Overloaded screens.
- Web-style navigation menus.
- Excessive scrolling through irrelevant information.

Use React Native and Expo.

## 4.3 Mobile navigation

Create a bottom navigation bar with five primary destinations:

1. Home.
2. Marketplace.
3. RFQs.
4. Messages.
5. Account.

Additional functionality should be accessed through appropriate secondary screens.

The navigation should remain consistent throughout the application.

## 4.4 Mobile home screen

Create a personalised mobile dashboard.

Include:

- Welcome message.
- Business verification status.
- Search field.
- Quick actions.
- Recommended commodities.
- Relevant supply listings.
- Relevant demand listings.
- Recent RFQs.
- New messages.
- Notifications.
- Saved opportunities.

Quick actions should include:

- Find a Supplier.
- Find a Buyer.
- Post Supply.
- Post Requirement.
- Create RFQ.

Display information according to the user's business role.

## 4.5 Mobile marketplace

Create an easy-to-use mobile discovery experience.

Include:

- Search.
- Category browsing.
- Country selection.
- Filters.
- Commodity listings.
- Supplier profiles.
- Verification indicators.
- Saved listings.
- Share functionality.

Use mobile-friendly listing cards.

Allow users to open a listing to see:

- Product information.
- Technical specifications.
- Available quantity.
- Origin.
- Seller information.
- Verification details.
- Delivery information.
- Documents.
- Contact supplier.
- Request quotation.
- Save listing.

## 4.6 Mobile RFQ management

Buyers must be able to:

- View active RFQs.
- Create new RFQs.
- Review incoming quotations.
- Open supplier responses.
- Compare essential quotation details.
- Ask questions.
- Shortlist suppliers.
- Accept or reject offers.
- Track RFQ status.

Suppliers must be able to:

- View incoming RFQs.
- Review buyer requirements.
- Ask clarification questions.
- Submit quotations.
- Attach documents.
- Update quotation status.
- Track their responses.

Complex quotation comparisons should be presented using readable mobile layouts rather than compressed desktop tables.

## 4.7 Mobile messaging

Messaging must be a major feature.

Include:

- Business conversations.
- RFQ-linked conversations.
- Listing-linked conversations.
- Document attachments.
- Message timestamps.
- Read status.
- Notifications.
- Search conversations.

Make it easy to move from a conversation to the relevant business profile, listing or RFQ.

## 4.8 Mobile notifications

Implement native push notifications.

Notify users about:

- New RFQs.
- New quotations.
- Messages.
- Supplier responses.
- Buyer enquiries.
- Verification updates.
- Listing approvals.
- Listing expiry.
- Saved search matches.
- Relevant trade opportunities.

Users must be able to configure notification preferences.

Notifications must open the relevant application screen.

Do not send unnecessary or repetitive notifications.

## 4.9 Mobile business profile

Users must be able to:

- View their business profile.
- Edit business information.
- Upload verification documents.
- Check verification progress.
- Manage authorised users where permitted.
- View active listings.
- View business activity.
- Manage account settings.

## 4.10 Mobile listing management

Allow users to create and manage supply listings from their phones.

Support:

- Commodity selection.
- Dynamic specifications.
- Quantity.
- Price or price-on-request.
- Origin.
- Availability.
- Delivery details.
- Image uploads.
- Document uploads.
- Draft saving.
- Publication.

The mobile listing process should be divided into clear, manageable steps.

## 4.11 Mobile camera and document capabilities

Use native mobile capabilities where appropriate.

Support:

- Camera-based document capture.
- Photo uploads.
- Image compression.
- PDF uploads.
- Document preview.
- Secure file transfer.
- Permission handling.

Do not store sensitive business documents insecurely on the device.

## 4.12 Mobile saved searches and opportunities

Users should be able to:

- Save commodities.
- Save suppliers.
- Save listings.
- Save searches.
- Follow trade opportunities.
- Receive alerts when relevant supply or demand appears.

## 4.13 Mobile account and security

Implement:

- Secure authentication.
- Secure token storage.
- Session expiry.
- Logout.
- Account recovery.
- Optional biometric authentication where supported.
- Device permission management.
- Privacy controls.

Do not store passwords or sensitive authentication information in ordinary local storage.

## 4.14 Mobile offline behaviour

Support sensible offline behaviour.

Users should be able to access previously loaded non-sensitive information where appropriate.

Provide clear indicators when information is outdated or unavailable offline.

Allow draft creation where practical.

Do not pretend that a listing, quotation or message has been submitted when the device is offline.

Synchronise safely when connectivity returns, with duplicate-submission protection.

## 4.15 Mobile design direction

The mobile application should share TerraExchange's branding, typography, colour palette and visual identity.

However, the mobile interface must be designed independently.

Use a polished, premium, practical B2B application aesthetic.

Prioritise:

- Speed.
- Readability.
- Simplicity.
- Trust.
- Fast access to important actions.
- Clear status indicators.
- Efficient business communication.

---

# PART 5 — SHARED BUSINESS RULES AND SECURITY

These rules must be enforced by the backend and respected by both applications.

## 5.1 Permissions

Users must only access information and actions permitted by their roles.

A business must only manage its own records unless authorised access has been granted.

Administrative permissions must be separate from normal business permissions.

## 5.2 Privacy

Protect:

- Personal information.
- Business registration documents.
- Commercial quotations.
- Buyer identities where confidentiality is requested.
- Supplier pricing.
- Negotiation history.
- Transaction information.

Do not expose private business information in public marketplace listings.

## 5.3 Audit trail

Record important actions:

- Registration.
- Verification.
- Listing creation and changes.
- RFQ creation.
- Quotation submission.
- Negotiation events.
- Permission changes.
- Administrative decisions.
- Transaction status changes.

## 5.4 Commercial transparency

The platform must distinguish:

- Marketplace listings.
- Verified supply.
- Indicative offers.
- Confirmed quotations.
- Negotiated agreements.
- Completed transactions.

A listing is not proof that physical stock exists.

A quotation is not a completed transaction.

Do not imply that TerraExchange guarantees the performance of every buyer or seller.

## 5.5 Regulatory compliance

The platform must be designed to accommodate relevant regulatory requirements, including:

- Business verification.
- KYC and KYB where appropriate.
- AML and sanctions screening where applicable.
- Import and export controls.
- Commodity-specific permits.
- Customs documentation.
- Product certification.
- Hazardous materials restrictions.
- Data protection.
- Country-specific trade regulations.

The platform must not facilitate prohibited trade.

---

# PART 6 — SHARED API AND DATA CONTRACTS

Design the backend API before independently implementing complex application features.

Create documented API contracts for:

- Authentication.
- Users.
- Businesses.
- Business members.
- Verification.
- Commodities.
- Commodity specifications.
- Supply listings.
- Demand listings.
- RFQs.
- Quotations.
- Matching.
- Messaging.
- Notifications.
- Documents.
- Trade opportunities.
- CRM.
- Landed cost estimates.
- Administration.

Use consistent response structures, error handling and pagination.

Generate or maintain shared TypeScript types from the API contracts where possible.

Both applications must use the same API endpoints and backend validation rules.

---

# PART 7 — DEVELOPMENT AND DELIVERY SEQUENCE

Do not attempt to generate the entire platform in one uncontrolled implementation.

Develop in clearly separated phases.

## Phase 1: Architecture and foundation

Deliver:

- System architecture.
- Database schema.
- API specification.
- Authentication.
- Business accounts.
- Role permissions.
- Commodity catalogue foundation.
- Shared TypeScript contracts.
- Development environment.

Do not start building large numbers of disconnected screens before the underlying architecture is defined.

## Phase 2: Web application foundation

Develop the web application's:

- Design system.
- Navigation.
- Homepage.
- Authentication screens.
- Business dashboard.
- Marketplace.
- Listing details.
- Business profiles.

Ensure these screens are connected to the backend.

## Phase 3: Core marketplace functionality

Develop:

- Supply listings.
- Demand listings.
- RFQs.
- Quotations.
- Messaging.
- Matching.
- Saved searches.
- Notifications.

## Phase 4: Mobile application foundation

Develop the dedicated Android and iOS application.

Implement:

- Authentication.
- Navigation.
- Home dashboard.
- Marketplace.
- Business profiles.
- RFQ management.
- Messaging.
- Notifications.

Connect it to the same backend used by the web application.

## Phase 5: Trade Desk and intelligence

Develop:

- Buyer Intelligence.
- Supplier Intelligence.
- Trade Desk CRM.
- Opportunity pipeline.
- Landed cost calculator.
- Trade intelligence.
- Administration.

## Phase 6: Testing and production readiness

Test:

- Authentication across both applications.
- Business permissions.
- Listing creation and updates.
- RFQ creation and responses.
- Messaging.
- Document uploads.
- Notifications.
- Search and filtering.
- Cross-application synchronisation.
- Mobile device compatibility.
- Performance.
- Security.
- Data validation.

A listing created on the web application must immediately become available to the mobile application through the shared backend, subject to normal synchronisation and caching.

A quotation submitted through mobile must appear in the web dashboard.

Messages and notifications must remain consistent across both applications.

---

# PART 8 — REQUIRED PROJECT STRUCTURE

Maintain clear separation between the applications and shared infrastructure.

Suggested repository structure:

terraexchange/
- apps/
  - web/
  - mobile/
  - api/
  - admin/
- packages/
  - shared-types/
  - api-client/
  - validation/
  - business-logic/
  - commodity-catalogue/
  - configuration/
- database/
  - migrations/
  - seeds/
- documentation/
  - architecture/
  - api/
  - database/
  - web/
  - mobile/
  - deployment/
- infrastructure/
- README.md

Adapt this structure if the selected framework requires a different arrangement, but preserve the separation of responsibilities.

The web application must not import mobile-only presentation components.

The mobile application must not import web-only presentation components.

Shared packages must contain genuinely shared functionality, not user-interface code that causes cross-platform conflicts.

---

# PART 9 — MANDATORY AI DEVELOPMENT INSTRUCTIONS

Before writing significant amounts of code:

1. Analyse the complete project requirements.
2. Identify technical dependencies.
3. Design the system architecture.
4. Define the database structure.
5. Define the API contracts.
6. Define the shared business rules.
7. Define the web application independently.
8. Define the mobile application independently.
9. Identify any architectural conflicts.
10. Present a development plan.

Do not silently remove requirements.

Do not merge web and mobile implementation instructions.

When working on the web application, follow Part 3.

When working on the mobile application, follow Part 4.

When working on backend functionality, follow Parts 2, 5 and 6.

If a feature requires changes to more than one application, identify the shared backend change and then implement each application's interface separately.

Do not claim a feature is complete unless it has been implemented and tested.

Maintain documentation as the system develops.

At the end of every development phase, provide:

- Files created or modified.
- Features implemented.
- API endpoints created or changed.
- Database changes.
- Tests performed.
- Outstanding issues.
- Next development phase.

---

# FINAL PRODUCT OBJECTIVE

TerraExchange must become a credible international commercial network that makes it easier for legitimate businesses to find physical commodities, source industrial products, discover buyers, issue procurement requirements, compare suppliers and establish trade relationships.

The platform must not simply be a directory of companies.

Its competitive advantage must come from the combination of:

1. Verified business identities.
2. Structured commodity supply and demand.
3. A powerful RFQ and quotation engine.
4. International supplier and buyer discovery.
5. Buyer and supplier intelligence.
6. An active Trade Desk that creates commercial opportunities.
7. Shared web and mobile access.
8. A scalable international trade infrastructure.

Build a platform that can start with real South African and China–South Africa commercial opportunities and expand into a genuinely international marketplace.

**The web application and mobile application are two independent products sharing one commercial platform, one backend, one database and one set of business rules. Preserve that separation throughout development.**