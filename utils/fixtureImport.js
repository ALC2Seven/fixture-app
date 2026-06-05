const ExcelJS = require("exceljs");

// Column definitions — order matters, matches the template
const COLUMNS = [
  { header: "Date (DD/MM/YYYY)",   key: "date",        width: 18 },
  { header: "Kick-off Time (HH:MM)", key: "kickoff",   width: 20 },
  { header: "End Time (HH:MM)",    key: "endtime",      width: 18 },
  { header: "Opponent",            key: "opponent",     width: 25 },
  { header: "Home or Away",        key: "homeaway",     width: 16 },
  { header: "Venue",               key: "venue",        width: 30 },
  { header: "Competition",         key: "competition",  width: 30 },
];

// Generate a template Excel file as a buffer
async function generateTemplate(teamName) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Fixtures");

  sheet.columns = COLUMNS;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCC0000" } };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 20;

  // Add example row
  sheet.addRow({
    date:        "14/06/2026",
    kickoff:     "15:00",
    endtime:     "17:00",
    opponent:    "United AFC",
    homeaway:    "Home",
    venue:       "Riverside Stadium, Manchester",
    competition: "Premier League — Matchday 1",
  });

  // Style example row
  const exampleRow = sheet.getRow(2);
  exampleRow.font = { italic: true, color: { argb: "FF888888" } };

  // Add a note row
  sheet.addRow({
    date: "← DD/MM/YYYY format",
    kickoff: "← 24hr format",
    endtime: "← 24hr format",
    opponent: `← The other team (your team is always ${teamName})`,
    homeaway: "← Home or Away only",
    venue: "← Optional",
    competition: "← Optional",
  });
  const noteRow = sheet.getRow(3);
  noteRow.font = { italic: true, color: { argb: "FFAAAAAA" } };

  // Dropdown validation for Home or Away column
  sheet.getColumn("homeaway").eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    if (rowNumber > 1) {
      cell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Home,Away"'],
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// Parse an uploaded Excel or CSV buffer into fixture objects
async function parseFixtures(buffer, mimetype, teamName) {
  const workbook = new ExcelJS.Workbook();

  if (mimetype === "text/csv" || mimetype === "application/vnd.ms-excel") {
    // Try as CSV
    const { Readable } = require("stream");
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer);
  }

  const sheet = workbook.worksheets[0];
  const fixtures = [];
  const errors = [];

  sheet.eachRow((row, rowNumber) => {
    // Skip header, example, and note rows
    if (rowNumber <= 3) return;

    const date        = String(row.getCell(1).value || "").trim();
    const kickoff     = String(row.getCell(2).value || "").trim();
    const endtime     = String(row.getCell(3).value || "").trim();
    const opponent    = String(row.getCell(4).value || "").trim();
    const homeaway    = String(row.getCell(5).value || "").trim().toLowerCase();
    const venue       = String(row.getCell(6).value || "").trim();
    const competition = String(row.getCell(7).value || "").trim();

    // Skip blank rows
    if (!date && !opponent) return;

    // Validate required fields
    if (!date || !kickoff || !opponent || !homeaway) {
      errors.push(`Row ${rowNumber}: missing required fields (date, kick-off time, opponent, home/away)`);
      return;
    }

    if (!["home", "away"].includes(homeaway)) {
      errors.push(`Row ${rowNumber}: Home or Away must be "Home" or "Away"`);
      return;
    }

    // Parse date DD/MM/YYYY
    const [day, month, year] = date.split("/");
    if (!day || !month || !year) {
      errors.push(`Row ${rowNumber}: invalid date format — use DD/MM/YYYY`);
      return;
    }

    // Build ISO datetime strings
    const startISO = `${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}T${kickoff.padStart(5,"0")}:00Z`;
    const endISO   = `${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}T${endtime.padStart(5,"0")}:00Z`;

    if (isNaN(new Date(startISO))) {
      errors.push(`Row ${rowNumber}: invalid date or time`);
      return;
    }

    const isHome   = homeaway === "home";
    const homeTeam = isHome ? teamName : opponent;
    const awayTeam = isHome ? opponent : teamName;

    fixtures.push({
      summary:     `${homeTeam} vs ${awayTeam}`,
      homeTeam,
      awayTeam,
      isHome,
      start:       startISO,
      end:         endtime ? endISO : null,
      location:    venue || null,
      description: competition || null,
    });
  });

  return { fixtures, errors };
}

module.exports = { generateTemplate, parseFixtures };
