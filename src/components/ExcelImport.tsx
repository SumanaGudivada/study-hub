import * as XLSX from "xlsx";

interface ExcelImportProps {
  onImport: (data: any[]) => void;
}

export default function ExcelImport({ onImport }: ExcelImportProps) {

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {

      const data = new Uint8Array(
        event.target?.result as ArrayBuffer
      );

      const workbook = XLSX.read(data, {
        type: "array",
      });

      const sheetName = workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log(jsonData);

      onImport(jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={handleFileUpload}
      />
    </div>
  );
}