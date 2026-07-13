import * as XLSX from "xlsx";

export function exportMeetingReport(data: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(data);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Meetings"
  );

  XLSX.writeFile(
    workbook,
    `Meeting_Report_${Date.now()}.xlsx`
  );
}