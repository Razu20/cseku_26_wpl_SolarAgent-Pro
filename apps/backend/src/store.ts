export type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  location?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Site = {
  id: string;
  name: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  utility?: string;
  createdAt: string;
  updatedAt: string;
};

export type RecommendationCase = {
  id: string;
  customerName: string;
  objective: string;
  summary: string;
  facts: Array<{ key: string; value: string; status: string; source: string; confidence: number }>;
  createdAt: string;
  updatedAt: string;
};

export type EngineeringResult = {
  id: string;
  traceId: string;
  engine: string;
  formulaVersion: string;
  inputsHash: string;
  result: Record<string, unknown>;
  warnings: string[];
  assumptions: string[];
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  leadId: string;
  siteId: string;
  quoteId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Ticket = {
  id: string;
  siteId: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  leadId: string;
  fullName: string;
  phone: string;
  email?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
};

export type Opportunity = {
  id: string;
  leadId: string;
  stage: string;
  amount: number;
  closeDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  status: 'preferred' | 'approved' | 'conditional' | 'blocked';
  price: number;
  createdAt: string;
  updatedAt: string;
};

export type Quote = {
  id: string;
  projectId: string;
  total: number;
  marginPercent: number;
  validityDays: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Survey = {
  id: string;
  siteId: string;
  technician: string;
  status: 'draft' | 'offline' | 'synced' | 'approved';
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Utility = {
  id: string;
  name: string;
  company: string;
  region: string;
  status: 'configurable' | 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  status: 'available' | 'reserved' | 'picked' | 'dispatched' | 'installed' | 'damaged' | 'quarantine';
  warehouse: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkOrder = {
  id: string;
  projectId: string;
  title: string;
  status: 'scheduled' | 'in_progress' | 'blocked' | 'completed';
  technician: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type NEMApplication = {
  id: string;
  siteId: string;
  utility: string;
  status: 'submitted' | 'inspection_scheduled' | 'approved' | 'active' | 'exception';
  applicationRef: string;
  createdAt: string;
  updatedAt: string;
};

export type Device = {
  id: string;
  siteId: string;
  type: 'inverter' | 'battery' | 'meter' | 'weather' | 'gateway';
  status: 'online' | 'offline' | 'warning';
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
};

const leads: Lead[] = [];
const sites: Site[] = [];
const recommendations: RecommendationCase[] = [];
const engineeringResults: EngineeringResult[] = [];
const projects: Project[] = [];
const tickets: Ticket[] = [];
const contacts: Contact[] = [];
const opportunities: Opportunity[] = [];
const products: Product[] = [];
const quotes: Quote[] = [];
const surveys: Survey[] = [];
const utilities: Utility[] = [];
const inventoryItems: InventoryItem[] = [];
const workOrders: WorkOrder[] = [];
const nemApplications: NEMApplication[] = [];
const devices: Device[] = [];

export function createLead(input: Omit<Lead, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { status?: string }): Lead {
  const now = new Date().toISOString();
  const lead: Lead = {
    id: `lead-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: input.name,
    phone: input.phone,
    email: input.email,
    source: input.source,
    location: input.location,
    status: input.status ?? 'new',
    createdAt: now,
    updatedAt: now,
  };
  leads.push(lead);
  return lead;
}

export function getLead(id: string): Lead | undefined {
  return leads.find((lead) => lead.id === id);
}

export function listLeads(): Lead[] {
  return [...leads];
}

export function updateLead(id: string, patch: Partial<Lead>): Lead | undefined {
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return undefined;
  const updated = { ...leads[index], ...patch, updatedAt: new Date().toISOString() };
  leads[index] = updated;
  return updated;
}

export function deleteLead(id: string): boolean {
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return false;
  leads.splice(index, 1);
  return true;
}

export function createSite(input: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Site {
  const now = new Date().toISOString();
  const site: Site = {
    id: `site-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: input.name,
    address: input.address,
    city: input.city,
    latitude: input.latitude,
    longitude: input.longitude,
    utility: input.utility,
    createdAt: now,
    updatedAt: now,
  };
  sites.push(site);
  return site;
}

export function getSite(id: string): Site | undefined {
  return sites.find((site) => site.id === id);
}

export function listSites(): Site[] {
  return [...sites];
}

export function updateSite(id: string, patch: Partial<Site>): Site | undefined {
  const index = sites.findIndex((site) => site.id === id);
  if (index === -1) return undefined;
  const updated = { ...sites[index], ...patch, updatedAt: new Date().toISOString() };
  sites[index] = updated;
  return updated;
}

export function deleteSite(id: string): boolean {
  const index = sites.findIndex((site) => site.id === id);
  if (index === -1) return false;
  sites.splice(index, 1);
  return true;
}

export function createRecommendation(input: Omit<RecommendationCase, 'id' | 'createdAt' | 'updatedAt'>): RecommendationCase {
  const now = new Date().toISOString();
  const recommendation: RecommendationCase = {
    id: `rc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    customerName: input.customerName,
    objective: input.objective,
    summary: input.summary,
    facts: input.facts,
    createdAt: now,
    updatedAt: now,
  };
  recommendations.push(recommendation);
  return recommendation;
}

export function getRecommendation(id: string): RecommendationCase | undefined {
  return recommendations.find((item) => item.id === id);
}

export function listRecommendations(): RecommendationCase[] {
  return [...recommendations];
}

export function updateRecommendation(id: string, patch: Partial<RecommendationCase>): RecommendationCase | undefined {
  const index = recommendations.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...recommendations[index], ...patch, updatedAt: new Date().toISOString() };
  recommendations[index] = updated;
  return updated;
}

export function deleteRecommendation(id: string): boolean {
  const index = recommendations.findIndex((item) => item.id === id);
  if (index === -1) return false;
  recommendations.splice(index, 1);
  return true;
}

export function createEngineeringResult(input: Omit<EngineeringResult, 'id' | 'createdAt' | 'updatedAt'>): EngineeringResult {
  const now = new Date().toISOString();
  const result: EngineeringResult = {
    id: `eng-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    traceId: input.traceId,
    engine: input.engine,
    formulaVersion: input.formulaVersion,
    inputsHash: input.inputsHash,
    result: input.result,
    warnings: input.warnings,
    assumptions: input.assumptions,
    createdAt: now,
    updatedAt: now,
  };
  engineeringResults.push(result);
  return result;
}

export function getEngineeringResult(id: string): EngineeringResult | undefined {
  return engineeringResults.find((item) => item.id === id);
}

export function listEngineeringResults(): EngineeringResult[] {
  return [...engineeringResults];
}

export function updateEngineeringResult(id: string, patch: Partial<EngineeringResult>): EngineeringResult | undefined {
  const index = engineeringResults.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...engineeringResults[index], ...patch, updatedAt: new Date().toISOString() };
  engineeringResults[index] = updated;
  return updated;
}

export function deleteEngineeringResult(id: string): boolean {
  const index = engineeringResults.findIndex((item) => item.id === id);
  if (index === -1) return false;
  engineeringResults.splice(index, 1);
  return true;
}

export function createProject(input: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: `project-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    leadId: input.leadId,
    siteId: input.siteId,
    quoteId: input.quoteId,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
  projects.push(project);
  return project;
}

export function getProject(id: string): Project | undefined {
  return projects.find((item) => item.id === id);
}

export function listProjects(): Project[] {
  return [...projects];
}

export function updateProject(id: string, patch: Partial<Project>): Project | undefined {
  const index = projects.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...projects[index], ...patch, updatedAt: new Date().toISOString() };
  projects[index] = updated;
  return updated;
}

export function deleteProject(id: string): boolean {
  const index = projects.findIndex((item) => item.id === id);
  if (index === -1) return false;
  projects.splice(index, 1);
  return true;
}

export function createTicket(input: Omit<Ticket, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { status?: string }): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: `ticket-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    siteId: input.siteId,
    title: input.title,
    severity: input.severity,
    description: input.description,
    status: input.status ?? 'open',
    createdAt: now,
    updatedAt: now,
  };
  tickets.push(ticket);
  return ticket;
}

export function getTicket(id: string): Ticket | undefined {
  return tickets.find((item) => item.id === id);
}

export function listTickets(): Ticket[] {
  return [...tickets];
}

export function updateTicket(id: string, patch: Partial<Ticket>): Ticket | undefined {
  const index = tickets.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...tickets[index], ...patch, updatedAt: new Date().toISOString() };
  tickets[index] = updated;
  return updated;
}

export function deleteTicket(id: string): boolean {
  const index = tickets.findIndex((item) => item.id === id);
  if (index === -1) return false;
  tickets.splice(index, 1);
  return true;
}

export function createContact(input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
  const now = new Date().toISOString();
  const contact: Contact = {
    id: `contact-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    leadId: input.leadId,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    role: input.role,
    createdAt: now,
    updatedAt: now,
  };
  contacts.push(contact);
  return contact;
}

export function getContact(id: string): Contact | undefined {
  return contacts.find((item) => item.id === id);
}

export function listContacts(): Contact[] {
  return [...contacts];
}

export function updateContact(id: string, patch: Partial<Contact>): Contact | undefined {
  const index = contacts.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...contacts[index], ...patch, updatedAt: new Date().toISOString() };
  contacts[index] = updated;
  return updated;
}

export function deleteContact(id: string): boolean {
  const index = contacts.findIndex((item) => item.id === id);
  if (index === -1) return false;
  contacts.splice(index, 1);
  return true;
}

export function createOpportunity(input: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>): Opportunity {
  const now = new Date().toISOString();
  const opportunity: Opportunity = {
    id: `opp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    leadId: input.leadId,
    stage: input.stage,
    amount: input.amount,
    closeDate: input.closeDate,
    createdAt: now,
    updatedAt: now,
  };
  opportunities.push(opportunity);
  return opportunity;
}

export function getOpportunity(id: string): Opportunity | undefined {
  return opportunities.find((item) => item.id === id);
}

export function listOpportunities(): Opportunity[] {
  return [...opportunities];
}

export function updateOpportunity(id: string, patch: Partial<Opportunity>): Opportunity | undefined {
  const index = opportunities.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...opportunities[index], ...patch, updatedAt: new Date().toISOString() };
  opportunities[index] = updated;
  return updated;
}

export function deleteOpportunity(id: string): boolean {
  const index = opportunities.findIndex((item) => item.id === id);
  if (index === -1) return false;
  opportunities.splice(index, 1);
  return true;
}

export function createProduct(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
  const now = new Date().toISOString();
  const product: Product = {
    id: `prod-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sku: input.sku,
    name: input.name,
    category: input.category,
    status: input.status,
    price: input.price,
    createdAt: now,
    updatedAt: now,
  };
  products.push(product);
  return product;
}

export function getProduct(id: string): Product | undefined {
  return products.find((item) => item.id === id);
}

export function listProducts(): Product[] {
  return [...products];
}

export function updateProduct(id: string, patch: Partial<Product>): Product | undefined {
  const index = products.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...products[index], ...patch, updatedAt: new Date().toISOString() };
  products[index] = updated;
  return updated;
}

export function deleteProduct(id: string): boolean {
  const index = products.findIndex((item) => item.id === id);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}

export function createQuote(input: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Quote {
  const now = new Date().toISOString();
  const quote: Quote = {
    id: `quote-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    projectId: input.projectId,
    total: input.total,
    marginPercent: input.marginPercent,
    validityDays: input.validityDays,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
  quotes.push(quote);
  return quote;
}

export function getQuote(id: string): Quote | undefined {
  return quotes.find((item) => item.id === id);
}

export function listQuotes(): Quote[] {
  return [...quotes];
}

export function updateQuote(id: string, patch: Partial<Quote>): Quote | undefined {
  const index = quotes.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...quotes[index], ...patch, updatedAt: new Date().toISOString() };
  quotes[index] = updated;
  return updated;
}

export function deleteQuote(id: string): boolean {
  const index = quotes.findIndex((item) => item.id === id);
  if (index === -1) return false;
  quotes.splice(index, 1);
  return true;
}

export function createSurvey(input: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>): Survey {
  const now = new Date().toISOString();
  const survey: Survey = {
    id: `survey-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    siteId: input.siteId,
    technician: input.technician,
    status: input.status,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  surveys.push(survey);
  return survey;
}

export function getSurvey(id: string): Survey | undefined {
  return surveys.find((item) => item.id === id);
}

export function listSurveys(): Survey[] {
  return [...surveys];
}

export function updateSurvey(id: string, patch: Partial<Survey>): Survey | undefined {
  const index = surveys.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...surveys[index], ...patch, updatedAt: new Date().toISOString() };
  surveys[index] = updated;
  return updated;
}

export function deleteSurvey(id: string): boolean {
  const index = surveys.findIndex((item) => item.id === id);
  if (index === -1) return false;
  surveys.splice(index, 1);
  return true;
}

export function createUtility(input: Omit<Utility, 'id' | 'createdAt' | 'updatedAt'>): Utility {
  const now = new Date().toISOString();
  const utility: Utility = {
    id: `utility-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: input.name,
    company: input.company,
    region: input.region,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
  utilities.push(utility);
  return utility;
}

export function getUtility(id: string): Utility | undefined {
  return utilities.find((item) => item.id === id);
}

export function listUtilities(): Utility[] {
  return [...utilities];
}

export function updateUtility(id: string, patch: Partial<Utility>): Utility | undefined {
  const index = utilities.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...utilities[index], ...patch, updatedAt: new Date().toISOString() };
  utilities[index] = updated;
  return updated;
}

export function deleteUtility(id: string): boolean {
  const index = utilities.findIndex((item) => item.id === id);
  if (index === -1) return false;
  utilities.splice(index, 1);
  return true;
}

export function createInventoryItem(input: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): InventoryItem {
  const now = new Date().toISOString();
  const item: InventoryItem = {
    id: `inv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sku: input.sku,
    name: input.name,
    category: input.category,
    quantity: input.quantity,
    status: input.status,
    warehouse: input.warehouse,
    createdAt: now,
    updatedAt: now,
  };
  inventoryItems.push(item);
  return item;
}

export function getInventoryItem(id: string): InventoryItem | undefined {
  return inventoryItems.find((item) => item.id === id);
}

export function listInventoryItems(): InventoryItem[] {
  return [...inventoryItems];
}

export function updateInventoryItem(id: string, patch: Partial<InventoryItem>): InventoryItem | undefined {
  const index = inventoryItems.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...inventoryItems[index], ...patch, updatedAt: new Date().toISOString() };
  inventoryItems[index] = updated;
  return updated;
}

export function deleteInventoryItem(id: string): boolean {
  const index = inventoryItems.findIndex((item) => item.id === id);
  if (index === -1) return false;
  inventoryItems.splice(index, 1);
  return true;
}

export function createWorkOrder(input: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>): WorkOrder {
  const now = new Date().toISOString();
  const workOrder: WorkOrder = {
    id: `wo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    projectId: input.projectId,
    title: input.title,
    status: input.status,
    technician: input.technician,
    dueDate: input.dueDate,
    createdAt: now,
    updatedAt: now,
  };
  workOrders.push(workOrder);
  return workOrder;
}

export function getWorkOrder(id: string): WorkOrder | undefined {
  return workOrders.find((item) => item.id === id);
}

export function listWorkOrders(): WorkOrder[] {
  return [...workOrders];
}

export function updateWorkOrder(id: string, patch: Partial<WorkOrder>): WorkOrder | undefined {
  const index = workOrders.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...workOrders[index], ...patch, updatedAt: new Date().toISOString() };
  workOrders[index] = updated;
  return updated;
}

export function deleteWorkOrder(id: string): boolean {
  const index = workOrders.findIndex((item) => item.id === id);
  if (index === -1) return false;
  workOrders.splice(index, 1);
  return true;
}

export function createNEMApplication(input: Omit<NEMApplication, 'id' | 'createdAt' | 'updatedAt'>): NEMApplication {
  const now = new Date().toISOString();
  const nem: NEMApplication = {
    id: `nem-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    siteId: input.siteId,
    utility: input.utility,
    status: input.status,
    applicationRef: input.applicationRef,
    createdAt: now,
    updatedAt: now,
  };
  nemApplications.push(nem);
  return nem;
}

export function getNEMApplication(id: string): NEMApplication | undefined {
  return nemApplications.find((item) => item.id === id);
}

export function listNEMApplications(): NEMApplication[] {
  return [...nemApplications];
}

export function updateNEMApplication(id: string, patch: Partial<NEMApplication>): NEMApplication | undefined {
  const index = nemApplications.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...nemApplications[index], ...patch, updatedAt: new Date().toISOString() };
  nemApplications[index] = updated;
  return updated;
}

export function deleteNEMApplication(id: string): boolean {
  const index = nemApplications.findIndex((item) => item.id === id);
  if (index === -1) return false;
  nemApplications.splice(index, 1);
  return true;
}

export function createDevice(input: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Device {
  const now = new Date().toISOString();
  const device: Device = {
    id: `device-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    siteId: input.siteId,
    type: input.type,
    status: input.status,
    lastSeenAt: input.lastSeenAt,
    createdAt: now,
    updatedAt: now,
  };
  devices.push(device);
  return device;
}

export function getDevice(id: string): Device | undefined {
  return devices.find((item) => item.id === id);
}

export function listDevices(): Device[] {
  return [...devices];
}

export function updateDevice(id: string, patch: Partial<Device>): Device | undefined {
  const index = devices.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...devices[index], ...patch, updatedAt: new Date().toISOString() };
  devices[index] = updated;
  return updated;
}

export function deleteDevice(id: string): boolean {
  const index = devices.findIndex((item) => item.id === id);
  if (index === -1) return false;
  devices.splice(index, 1);
  return true;
}
