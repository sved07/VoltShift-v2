import PDFDocument from 'pdfkit';

export function createTutorialPdf(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: 'VoltShift Autonomous Grid Platform Tutorial & User Guide',
          Author: 'VoltShift Intelligent Energy Systems',
          Subject: 'Autonomous Clean Energy Load Shifting & Grid Telemetry Tutorial',
          Keywords: 'Energy, Smart Grid, AI Dispatch, Carbon Arbitrage, EIA Form 930, EV Fleets',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Color Palette - Apple Minimalist Dark / Silver Theme
      const primaryDark = '#09090b';
      const accentBlue = '#2563eb';
      const textDark = '#18181b';
      const textMuted = '#71717a';
      const cardBg = '#f4f4f5';
      const cardBorder = '#e4e4e7';
      const greenAccent = '#15803d';

      // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
      doc.rect(0, 0, doc.page.width, 140).fill('#0f172a');

      doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold').text('VOLTSHIFT OPERATIONAL TUTORIAL & SYSTEM GUIDE', 50, 40, { characterSpacing: 1.5 });
      doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('Autonomous Clean Energy Dispatch', 50, 60);
      doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text('Mastering Real-Time Grid Telemetry, Carbon Arbitrage, and Gemini Dispatch AI', 50, 95);

      doc.y = 170;
      doc.fillColor(textDark).fontSize(16).font('Helvetica-Bold').text('1. Executive Overview: What Is VoltShift?');
      doc.moveDown(0.5);

      doc.fillColor(textMuted).fontSize(10).font('Helvetica').lineGap(4).text(
        'VoltShift is an intelligent industrial energy coordination platform designed for data centers and commercial EV fleets. Modern electrical grids experience drastic swings in carbon intensity and wholesale power prices throughout the 24-hour diurnal cycle. During midday hours, high solar generation often causes "curtailment" (wasted surplus clean electricity). Conversely, during evening peak hours (the "Duck Curve"), utilities fire up carbon-heavy gas peaker plants, causing carbon intensity to spike by over 300%.\n\n' +
        'VoltShift continuously ingests real-time power grid feeds across major US Independent System Operators (ISOs) and dynamically schedules high-power flexible workloads—absorbing excess clean power when green energy is abundant, and instantly throttling or deferring load when peaker plants ignite.'
      );

      doc.moveDown(1.5);
      doc.fillColor(textDark).fontSize(16).font('Helvetica-Bold').text('2. What Data Is In Front of You?');
      doc.moveDown(0.5);

      // Data sources summary box
      const drawBox = (y: number, title: string, desc: string, badge: string) => {
        doc.roundedRect(50, y, doc.page.width - 100, 52, 6).fillAndStroke(cardBg, cardBorder);
        doc.fillColor(accentBlue).fontSize(9).font('Helvetica-Bold').text(badge.toUpperCase(), 65, y + 10);
        doc.fillColor(textDark).fontSize(11).font('Helvetica-Bold').text(title, 140, y + 9);
        doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(desc, 65, y + 27, { width: doc.page.width - 130 });
      };

      drawBox(doc.y, 'US EIA Form 930 Generation Fuel Mix', 'Hourly real-time megawatt outputs from Solar, Wind, Hydro, Nuclear, Natural Gas, and Coal across CAISO, ERCOT, PJM, MISO, NYISO, and ISONE.', 'Telemetry');
      doc.y += 60;
      drawBox(doc.y, 'Marginal Grid Carbon Intensity (gCO2/kWh)', 'Signals the exact carbon penalty of turning on an additional megawatt. Varies from 45 gCO2/kWh in clean hours to 680 gCO2/kWh during peaker events.', 'Emissions');
      doc.y += 60;
      drawBox(doc.y, 'Elastic Compute & Flexible Fleets', 'Workloads that can shift without violating user deadlines: Hyperscale LLM training clusters and commercial logistics EV charging depots.', 'Flexible Load');
      doc.y += 60;
      drawBox(doc.y, 'Gemini 3.8 Flash Autonomous Reasoning', 'An intelligent agent analyzing generation profiles every hour, executing optimal dispatch decisions, and providing interactive conversational Q&A.', 'Agent Intelligence');

      // --- PAGE 2: STEP-BY-STEP OPERATIONAL TUTORIAL ---
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 60).fill('#18181b');
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('Walkthrough Tutorial: What You Can Do & How To Do It', 50, 24);

      doc.y = 80;
      doc.fillColor(textDark).fontSize(14).font('Helvetica-Bold').text('Core Operational Controls');
      doc.moveDown(0.5);

      const renderStep = (num: string, title: string, instruction: string, result: string) => {
        doc.fillColor(accentBlue).fontSize(12).font('Helvetica-Bold').text(`Step ${num}: ${title}`);
        doc.moveDown(0.2);
        doc.fillColor(textDark).fontSize(9.5).font('Helvetica-Bold').text('How to do it: ', { continued: true });
        doc.fillColor(textMuted).font('Helvetica').text(instruction);
        doc.moveDown(0.2);
        doc.fillColor(greenAccent).fontSize(9.5).font('Helvetica-Bold').text('What happens: ', { continued: true });
        doc.fillColor(textMuted).font('Helvetica').text(result);
        doc.moveDown(0.8);
      };

      renderStep(
        '1',
        'Scrub Through Time (The 24-Hour Diurnal Cycle)',
        'Look at the bottom control bar and drag the time slider across 00:00 to 23:00, or click the "Auto-Play" button to simulate a full day in real time.',
        'Watch the national map and fuel stack bars shift. At 12:00, watch California (CAISO) and Texas (ERCOT) turn green as solar surges. At 17:00–19:00, observe the solar drop-off and gas ramp-up.'
      );

      renderStep(
        '2',
        'Toggle Autonomous AI Dispatch',
        'Click the "Autonomous AI Dispatch" button on the bottom control bar to switch between Manual Flat Load and Gemini Autonomous Dispatch.',
        'In Autonomous Mode, flexible workloads boost to 100% capacity during solar troughs (charging EVs and training models cheaply) and throttle to 25% minimums during evening peaker hours, slashing carbon and power costs.'
      );

      renderStep(
        '3',
        'Stress-Test with a Peaker Spike Simulation',
        'Click the "Simulate Peaker Spike" button in the bottom control bar.',
        'This triggers an emergency grid alert simulating an unexpected heatwave or transmission line trip. The Gemini agent immediately enforces emergency curtailment, safeguarding the grid from blackouts.'
      );

      renderStep(
        '4',
        'Inspect Regional Zones & Industrial Sites',
        'Click on any regional card on the left panel or click directly on map markers (Data Centers and EV Depots).',
        'A sliding detail drawer opens revealing exact fuel percentages, marginal emissions, workload batch progress, and strict completion deadlines (SLAs).'
      );

      renderStep(
        '5',
        'Engage with the Gemini Dispatch Agent Panel',
        'Look at the right side of the screen. Review "Live Reasoning" to understand current dispatch logic in plain language, or switch to the "Advisor Chat" tab.',
        'Ask the agent questions like "Why did you throttle load at 17:00?", "How much carbon did we save today?", or "Explain the duck curve." Gemini responds with clear, verified telemetry.'
      );

      // --- PAGE 3: DEEP DIVE & KEY METRICS ---
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 60).fill('#18181b');
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('System Mechanics & Key Performance Indicators (KPIs)', 50, 24);

      doc.y = 80;
      doc.fillColor(textDark).fontSize(14).font('Helvetica-Bold').text('Key Performance Indicators (KPIs) Explained');
      doc.moveDown(0.5);

      const renderKpi = (label: string, meaning: string, formula: string) => {
        doc.roundedRect(50, doc.y, doc.page.width - 100, 56, 6).fillAndStroke('#fafafa', cardBorder);
        doc.fillColor(textDark).fontSize(11).font('Helvetica-Bold').text(label, 65, doc.y + 10);
        doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(meaning, 65, doc.y + 26, { width: doc.page.width - 130 });
        doc.fillColor(accentBlue).fontSize(8.5).font('Helvetica-Bold').text(formula, 65, doc.y + 40);
        doc.y += 66;
      };

      renderKpi(
        'CO2 Avoided (kg & Metric Tons)',
        'The net mass of greenhouse gas emissions eliminated by shifting load away from high-carbon fossil hours into zero-carbon renewable windows.',
        'Calculated against an unmanaged baseline running constant flat power.'
      );

      renderKpi(
        'MWh Shifted (Megawatt-Hours)',
        'The total volume of electrical energy intelligently rescheduled into clean solar/wind generation surplus periods.',
        'Tracks flexible energy absorption without violating delivery guarantees.'
      );

      renderKpi(
        'Cost Savings ($ USD)',
        'Economic value captured by purchasing electricity during wholesale LMP low/negative price hours and avoiding peaker price spikes ($1,000+/MWh).',
        'Direct monetary savings delivered to industrial facility operators.'
      );

      renderKpi(
        'SLA Completion Rate (%)',
        'Guarantees that AI models finish their training runs and EV fleet trucks reach 100% state-of-charge before their morning departure windows.',
        '100% target: Workloads are never sacrificed for efficiency.'
      );

      doc.y += 10;
      doc.fillColor(textDark).fontSize(14).font('Helvetica-Bold').text('Practical Operational Tips');
      doc.moveDown(0.5);

      doc.fillColor(textMuted).fontSize(9.5).font('Helvetica').lineGap(4).text(
        '- Use the Presets: The suggestion chips in the Chat Advisor allow one-click inquiries into duck curve throttling, midday solar absorption, and peaker events.\n' +
        '- Switch Map Modes: Use the bottom-right map switcher to toggle between Dark Grid, Satellite imagery, and Clean Streets to visualize geographic transmission corridors.\n' +
        '- Zero Jargon Mode: The Gemini Dispatch Agent is tuned to explain complex electrical engineering and economics in crisp, executive-grade English suitable for non-technical stakeholders.'
      );

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#a1a1aa').fontSize(8).font('Helvetica').text(
          `VoltShift Intelligent Grid Dispatch Tutorial  |  Page ${i + 1} of ${pages.count}  |  Generated On-Demand`,
          50,
          doc.page.height - 35,
          { align: 'center', width: doc.page.width - 100 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
