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

  // Force date and time columns to plain text so Excel never converts them
  ["date", "kickoff", "endtime"].forEach(key => {
    sheet.getColumn(key).numFmt = "@";
    sheet.getColumn(key).eachCell({ includeEmpty: false }, cell => {
      cell.numFmt = "@";
    });
  });

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

    // Helper: extract date parts — handles JS Date, Excel serial number, formula result, or DD/MM/YYYY string
    function parseDateCell(cellValue) {
      if (cellValue === null || cellValue === undefined) return null;

      // Unwrap formula result objects: { formula: '...', result: <value> }
      if (typeof cellValue === "object" && !(cellValue instanceof Date) && cellValue.result !== undefined) {
        cellValue = cellValue.result;
      }

      // JS Date object (ExcelJS returns this for date-formatted cells)
      if (cellValue instanceof Date) {
        // Use local date parts — ExcelJS returns dates in local time, not UTC
        return {
          day:   String(cellValue.getDate()).padStart(2, "0"),
          month: String(cellValue.getMonth() + 1).padStart(2, "0"),
          year:  String(cellValue.getFullYear()),
        };
      }

      // Excel serial date number (e.g. 46187 = 14 Jun 2026)
      if (typeof cellValue === "number" && cellValue > 1000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(excelEpoch.getTime() + Math.floor(cellValue) * 86400000);
        return {
          day:   String(d.getUTCDate()).padStart(2, "0"),
          month: String(d.getUTCMonth() + 1).padStart(2, "0"),
          year:  String(d.getUTCFullYear()),
        };
      }

      // String — try DD/MM/YYYY
      const str = String(cellValue).trim();
      const parts = str.split("/");
      if (parts.length === 3) {
        return { day: parts[0].padStart(2,"0"), month: parts[1].padStart(2,"0"), year: parts[2].trim() };
      }

      // Last resort: log what we got so we can diagnose
      console.warn(`[import] Unrecognised date cell: type=${typeof cellValue}, value=${JSON.stringify(cellValue)}`);
      return null;
    }

    // Helper: extract HH:MM — handles JS Date (time fraction), number (fraction of day), or HH:MM string
    function parseTimeCell(cellValue) {
      if (cellValue === null || cellValue === undefined || cellValue === "") return "";

      // Unwrap formula result
      if (typeof cellValue === "object" && !(cellValue instanceof Date) && cellValue.result !== undefined) {
        cellValue = cellValue.result;
      }

      // JS Date (ExcelJS returns time-only cells as Date on epoch day)
      if (cellValue instanceof Date) {
        const h = String(cellValue.getUTCHours()).padStart(2,"0");
        const m = String(cellValue.getUTCMinutes()).padStart(2,"0");
        return `${h}:${m}`;
      }

      // Decimal fraction of a day: 0.625 = 15:00
      if (typeof cellValue === "number" && cellValue >= 0 && cellValue < 1) {
        const totalMins = Math.round(cellValue * 24 * 60);
        return `${String(Math.floor(totalMins / 60)).padStart(2,"0")}:${String(totalMins % 60).padStart(2,"0")}`;
      }

      return String(cellValue).trim();
    }

    const dateRaw     = row.getCell(1).value;
    const kickoffRaw  = row.getCell(2).value;
    const endtimeRaw  = row.getCell(3).value;
    if (rowNumber === 4) {
      console.log(`[import debug] row4 date: type=${typeof dateRaw}, val=${JSON.stringify(dateRaw)}, isDate=${dateRaw instanceof Date}`);
      console.log(`[import debug] row4 kickoff: type=${typeof kickoffRaw}, val=${JSON.stringify(kickoffRaw)}`);
    }
    const opponent    = String(row.getCell(4).value || "").trim();
    const homeaway    = String(row.getCell(5).value || "").trim().toLowerCase();
    const venue       = String(row.getCell(6).value || "").trim();
    const competition = String(row.getCell(7).value || "").trim();

    // Skip blank rows
    if (!dateRaw && !opponent) return;

    const parsedDate = parseDateCell(dateRaw);
    const kickoff    = parseTimeCell(kickoffRaw);
    const endtime    = parseTimeCell(endtimeRaw);
    const date       = dateRaw ? String(dateRaw) : "";

    // Validate required fields
    if (!parsedDate || !kickoff || !opponent || !homeaway) {
      errors.push(`Row ${rowNumber}: missing required fields (date, kick-off time, opponent, home/away)`);
      return;
    }

    if (!["home", "away"].includes(homeaway)) {
      errors.push(`Row ${rowNumber}: Home or Away must be "Home" or "Away"`);
      return;
    }

    const { day, month, year } = parsedDate;

    // Build ISO datetime strings
    const startISO = `${year}-${month}-${day}T${kickoff.padStart(5,"0")}:00Z`;
    const endISO   = `${year}-${month}-${day}T${endtime.padStart(5,"0")}:00Z`;

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
