import jsPDF from "jspdf";

export interface MeetingReport {
  title: string;
  date: string;
  organizer: string;
  status: string;
}

export function exportMeetingPDF(
  report: MeetingReport[]
) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Meeting Report", 20, 20);

  doc.setFontSize(12);

  let y = 40;

  report.forEach((item, index) => {
    doc.text(
      `${index + 1}. ${item.title}`,
      20,
      y
    );

    y += 8;

    doc.text(
      `Date: ${item.date}`,
      25,
      y
    );

    y += 8;

    doc.text(
      `Organizer: ${item.organizer}`,
      25,
      y
    );

    y += 8;

    doc.text(
      `Status: ${item.status}`,
      25,
      y
    );

    y += 15;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("Meeting_Report.pdf");
}