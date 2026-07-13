import jsPDF from "jspdf";

export function exportManagementReport(
  data: any
) {
  const doc = new jsPDF();

  doc.text(
    "Executive KPI Report",
    20,
    20
  );

  doc.text(
    `Meetings: ${data.meetings}`,
    20,
    40
  );

  doc.text(
    `Open Actions: ${data.openActions}`,
    20,
    50
  );

  doc.text(
    `Defects: ${data.defects}`,
    20,
    60
  );

  doc.text(
    `Attendance: ${data.attendance}%`,
    20,
    70
  );

  doc.text(
    `RF Pass Rate: ${data.rfPassRate}%`,
    20,
    80
  );

  doc.save(
    "Executive_Report.pdf"
  );
}