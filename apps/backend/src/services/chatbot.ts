import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { adminSettings, orders, supportTickets } from '../db/schema.js';

export interface ChatbotRequest {
  mode: 'org_support' | 'technical_assistant';
  userMessage: string;
  context?: {
    page?: string;
    step?: number;
    projectType?: 'solar' | 'wind' | 'hybrid';
    systemType?: 'on-grid' | 'off-grid' | 'hybrid-grid';
    connectedLoadW?: number;
    dailyConsumptionKwh?: number;
    rooftopAreaSqFt?: number;
    rooftopType?: string;
    validationError?: string;
    userId?: string;
    userEmail?: string;
  };
}

export async function processChatbotMessage(req: ChatbotRequest): Promise<{ reply: string; actionSuggestion?: string; orderStatus?: any }> {
  const { mode, userMessage, context } = req;
  const lowerMsg = userMessage.toLowerCase().trim();

  // Load documentation / organization settings
  const settingsRows = await db.select().from(adminSettings);
  const docSettings = (settingsRows.find((s) => s.key === 'doc_settings')?.data as any) || {
    organizationName: 'SolarAgent Pro Bangladesh Ltd.',
    corporateOffice: 'Level 9, Green Energy Tower, Banani, Dhaka-1213',
    helplineNumber: '+880 9612-SOLAR (76527)',
    supportEmail: 'support@solaragent.com.bd',
  };

  // ----------------------------------------------------
  // MODE A: ORGANIZATION SUPPORT
  // ----------------------------------------------------
  if (mode === 'org_support') {
    // 1. Order Status Lookup
    const orderMatch = lowerMsg.match(/(ord-\d+-[a-z0-9]+|ord-[a-z0-9-]+)/i) || userMessage.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (orderMatch) {
      const orderSearch = orderMatch[1];
      const allOrders = await db.select().from(orders);
      const matchedOrder = allOrders.find(
        (o) => o.orderNumber.toLowerCase() === orderSearch.toLowerCase() || o.id === orderSearch
      );

      if (matchedOrder) {
        return {
          reply: `Order **${matchedOrder.orderNumber}** (${matchedOrder.projectType.toUpperCase()} System) is currently in **${matchedOrder.status.toUpperCase()}** status. Payment status is **${matchedOrder.paymentStatus.toUpperCase()}** via ${matchedOrder.paymentMethod.toUpperCase()}. ${matchedOrder.scheduledDate ? `Installation is scheduled for: ${matchedOrder.scheduledDate}.` : 'Our technician dispatch team is reviewing site accessibility.'}`,
          orderStatus: {
            orderNumber: matchedOrder.orderNumber,
            status: matchedOrder.status,
            paymentStatus: matchedOrder.paymentStatus,
            totalAmount: matchedOrder.totalAmount,
            scheduledDate: matchedOrder.scheduledDate,
          },
          actionSuggestion: 'Track full project updates in your customer dashboard or contact customer care.',
        };
      } else {
        return {
          reply: `I could not find an active order matching "${orderSearch}". Please verify the order number from your dashboard or invoice email.`,
        };
      }
    }

    // 2. Organization Info & Contact
    if (lowerMsg.includes('contact') || lowerMsg.includes('phone') || lowerMsg.includes('address') || lowerMsg.includes('office') || lowerMsg.includes('helpline')) {
      return {
        reply: `**${docSettings.organizationName}**\n\n- **Corporate Headquarters**: ${docSettings.corporateOffice}\n- **Customer Hotline**: ${docSettings.helplineNumber} (9 AM - 8 PM daily)\n- **Support Email**: ${docSettings.supportEmail}\n- **Field Operations**: We operate certified engineering teams across all 8 divisions and 64 districts in Bangladesh.`,
        actionSuggestion: 'You can also create a support ticket directly from this portal.',
      };
    }

    // 3. Warranty & Guarantee
    if (lowerMsg.includes('warranty') || lowerMsg.includes('guarantee')) {
      return {
        reply: `Our standard warranties include:\n\n- **Solar Panels**: 25-Year Linear Power Performance Guarantee (minimum 84.8% output at year 25) and 12-15 Year Product Warranty.\n- **Inverters (Huawei/Growatt/Deye)**: 5-Year standard replacement warranty.\n- **Lithium Batteries (Pylontech/Dyness)**: 10-Year or 6,000 deep cycle warranty.\n- **Deep Cycle Tubular Batteries (Rahimafrooz)**: 2.5-Year warranty.\n- **Workmanship**: 1-Year free preventative maintenance and site inspection service.`,
      };
    }

    // 4. Payment Policy & Methods
    if (lowerMsg.includes('payment') || lowerMsg.includes('sslcommerz') || lowerMsg.includes('cod') || lowerMsg.includes('bkash') || lowerMsg.includes('card')) {
      return {
        reply: `We accept two secure payment options:\n\n1. **Online Payment (SSLCommerz)**: Pay with bKash, Nagad, Rocket, or Visa/MasterCard debit/credit cards with instant transaction verification.\n2. **Cash on Delivery (COD / Site Verification)**: Pay after physical delivery and on-site inspection by our certified installation engineer. No upfront card charges.`,
      };
    }

    // 5. Support Ticket Creation Request
    if (lowerMsg.includes('ticket') || lowerMsg.includes('complaint') || lowerMsg.includes('issue') || lowerMsg.includes('help')) {
      return {
        reply: `I would be glad to help log a support ticket for our customer care team. Could you please specify your registered order number or location, along with a description of the issue?`,
        actionSuggestion: 'Type your message with the problem details to register a formal ticket.',
      };
    }

    // Default Org Support Reply
    return {
      reply: `Welcome to **${docSettings.organizationName}** Customer Support! I can assist you with:\n\n- Looking up the status of an existing order (simply type your Order Number, e.g., \`ORD-...\`)\n- Details on our turnkey Solar, Wind, and Hybrid project installation packages\n- Payment verification (SSLCommerz and Cash on Delivery)\n- Organization contact information and certified engineer dispatch.`,
      actionSuggestion: 'Ask about order status, warranty, payment options, or certified technicians.',
    };
  }

  // ----------------------------------------------------
  // MODE B: TECHNICAL ASSISTANT (CONTEXT-AWARE)
  // ----------------------------------------------------
  const currentStep = context?.step ?? 1;
  const projectType = context?.projectType ?? 'solar';
  const systemType = context?.systemType ?? 'on-grid';

  // 1. Validation Error Handling (Section 26 requirement)
  if (context?.validationError) {
    return {
      reply: `⚠️ **How to resolve this validation error:**\n\n"${context.validationError}"\n\n**Resolution steps:**\n- If your rooftop area is required, ensure you enter a positive number in square feet (e.g., 350 sq ft).\n- If appliance quantities or operating hours are missing, ensure all added appliances have at least 1 unit and 0.5 to 24 hours of daily operation.\n- Make sure all Bangladesh location selectors (Division, District, Upazila) are selected.`,
      actionSuggestion: 'Check the highlighted fields above and re-click Calculate.',
    };
  }

  // 2. Specific Query Overrides
  if (lowerMsg.includes('high-grid') || lowerMsg.includes('high grid')) {
    return {
      reply: `**High-Grid (Hybrid Grid-Interactive Architecture)**:\n\nIn Bangladesh renewable energy systems, **High-Grid** refers to high-voltage grid-interactive systems with smart net-metering export capability and lithium battery energy storage. It offers:\n- Daytime export of excess power to the utility (DESCO/DPDC/BREB) for electricity bill credits.\n- Instantaneous (<4ms) automatic failover to battery storage when the utility grid experiences load shedding, ensuring continuous power to essential loads like lights, fans, routers, and refrigeration.`,
    };
  }

  if (lowerMsg.includes('on-grid') || lowerMsg.includes('on grid') || lowerMsg.includes('net meter')) {
    return {
      reply: `**On-Grid (Net Metered) System**:\n\n- Connects directly to the utility grid through a bidirectional net meter adhering to the Bangladesh Net Metering Guidelines 2018.\n- **Zero Batteries Required**: Keeps system capital cost lowest with fastest payback (typically 3.5 - 4.5 years).\n- During daylight, your solar panels power your home; excess energy is exported to the national grid.\n- **Safety Note**: In accordance with national anti-islanding regulations, the inverter automatically shuts down during grid power outages to protect utility line workers.`,
    };
  }

  if (lowerMsg.includes('off-grid') || lowerMsg.includes('off grid') || lowerMsg.includes('battery')) {
    return {
      reply: `**Off-Grid Autonomous System**:\n\n- Completely independent from the utility grid.\n- Sized with an energy storage battery bank to provide 1.5 days of autonomy during rainy or overcast monsoon days.\n- Ideal for remote rural homes, char areas, farmhouses, or locations without a stable grid connection.`,
    };
  }

  if (lowerMsg.includes('peak sun hour') || lowerMsg.includes('psh') || lowerMsg.includes('sun hours')) {
    return {
      reply: `**Peak Sun Hours (PSH) in Bangladesh**:\n\nBangladesh receives an average solar insolation of **4.0 to 4.7 Peak Sun Hours per day** across different regions. 1 Peak Sun Hour equals 1,000 W/m² of standard sunlight for 1 hour. For instance, Dhaka averages ~4.3 PSH, Rajshahi ~4.7 PSH, and Chittagong ~4.5 PSH. We use these calibrated regional benchmarks to calculate your system's expected daily kilowatt-hours (kWh).`,
    };
  }

  if (lowerMsg.includes('suitability') || lowerMsg.includes('score') || lowerMsg.includes('matching rate')) {
    return {
      reply: `**How your Suitability Score is calculated (100% Scale)**:\n\n1. **Rooftop Area Fit (35 Points)**: Compares available roof sq ft with the physical footprint required for the solar panels.\n2. **Roof Construction (25 Points)**: Concrete roof earns 25 pts, Metal tin roof 23 pts, Tile 18 pts.\n3. **Regional Solar/Wind Resource (25 Points)**: Based on the historical insolation and average wind speed in your selected Bangladesh district.\n4. **Exposure & Shading Index (15 Points)**: Rural/open areas score highest due to minimal obstruction compared to dense city centers.`,
    };
  }

  // 3. Step-by-Step Contextual Assistance (Section 26)
  if (currentStep === 1 || lowerMsg.includes('rooftop') || lowerMsg.includes('location')) {
    return {
      reply: `📍 **Step 1 Technical Guidance: Site & Rooftop Setup**\n\n- **Division & District**: Select your location to calibrate local Peak Sun Hours (PSH) and wind velocity.\n- **Rooftop Type**:\n  - **Concrete**: Best for aluminum tilt frames anchored with chemical masonry bolts at a 22°-24° tilt angle facing South.\n  - **Metal / Tin Roof**: Mounted with non-penetrating standing seam or EPDM rubber-sealed rail clamps.\n- **Area (Sq Ft)**: As a rule of thumb, every 1 kWp of solar capacity requires approximately **80 to 90 sq ft** of unobstructed, shade-free roof space.`,
      actionSuggestion: 'Enter your rooftop square footage to verify if the recommended system will physically fit.',
    };
  }

  if (currentStep === 2 || lowerMsg.includes('appliance') || lowerMsg.includes('load') || lowerMsg.includes('watt') || lowerMsg.includes('surge')) {
    return {
      reply: `⚡ **Step 2 Technical Guidance: Electrical Load Sizing**\n\n- **Rated Wattage (W)**: The continuous operating electrical power consumed by the appliance.\n- **Quantity**: The number of identical units in daily operation.\n- **Daily Hours**: Average hours the device runs per 24-hour cycle.\n- **Surge / Starting Power**: Inductive motor loads (such as Refrigerator compressors, Water pumps, and Air Conditioners) draw 2x to 4x their rated power for a few seconds during startup. Our engineering model automatically sizes your inverter to handle these peak surges without tripping.`,
      actionSuggestion: 'Add your high-draw appliances (AC, pump, fridge) to ensure accurate battery and inverter sizing.',
    };
  }

  if (currentStep >= 3 || lowerMsg.includes('pricing') || lowerMsg.includes('cost') || lowerMsg.includes('bom')) {
    return {
      reply: `📊 **Step 3 Technical Guidance: Sizing, Pricing & BOM**\n\n- **Recommended Capacity**: Calculated based on your total daily kWh consumption divided by regional sun hours with an 80% system performance ratio.\n- **Itemized Pricing**: Every component (Panels, Inverter, Battery, Rails, DC Combiner Box, Installation, and VAT) is priced transparently from our live database with no hidden fees.\n- **Payback Period**: Estimates how many years it will take for your electricity bill savings to pay back the full system installation cost.`,
      actionSuggestion: 'Review your preliminary Bill of Materials and click Confirm to generate your installation document.',
    };
  }

  // Default Technical Assistant Reply
  return {
    reply: `Hello! I am your **SolarAgent Pro Technical Assistant**. You are currently configuring a **${projectType.toUpperCase()} (${systemType.toUpperCase()})** project.\n\nI can explain:\n- Differences between On-Grid, Off-Grid, and High-Grid architectures\n- Sizing rules for solar panels, inverters, and battery autonomy\n- How rooftop type and area affect installation safety and tilt angles\n- How to interpret your estimated generation and payback period.`,
    actionSuggestion: 'Ask a question about solar capacity, batteries, or rooftop requirements.',
  };
}
