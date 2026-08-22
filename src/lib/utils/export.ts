export function downloadCSV(

	filename: string,

	rows: string[][]

) {

	const csv = rows

		.map((r) => r.join(","))

		.join("\n");

	const blob = new Blob(

		[csv],

		{

			type: "text/csv"

		}

	);

	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");

	a.href = url;

	a.download = filename;

	a.click();

	URL.revokeObjectURL(url);

}