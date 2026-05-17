import ExcelJS from "exceljs";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Exports data to a genuine, modern binary Excel Workbook (.xlsx) with professional styling.
 * Uses the exceljs library to guarantee native support for grids, clickable hyperlinks,
 * alternating row colors, column auto-fitting, and custom brand fills across modern versions
 * of Microsoft Excel, Google Sheets, and LibreOffice without any compatibility alerts.
 */
export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExcelColumn[],
  sheetName: string = "Entreprises",
  fileName: string = "entreprises-autour-de-moi"
) {
  if (typeof window === "undefined") return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }] // Ensure standard gridlines are displayed explicitly in Excel
  });

  // Set worksheet columns with dynamic auto-fitting logic based on content length
  worksheet.columns = columns.map((col) => {
    // Find maximum character length among the header and all rows for this key
    const maxCharLength = data.reduce((max, row) => {
      const val = row[col.key] ?? "";
      const len = String(val).length;
      return len > max ? len : max;
    }, col.header.length);

    // Dynamic column width: ~1.1 units per character plus 4 units padding, bounded between [12, 50]
    const calculatedWidth = Math.max(12, Math.min(50, maxCharLength * 1.1 + 4));

    return {
      header: col.header,
      key: col.key,
      width: calculatedWidth
    };
  });

  // Format Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28; // Spacious padding

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Segoe UI",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" }
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" } // Premium deep slate-900 brand color
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: false
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF334155" } },
      bottom: { style: "medium", color: { argb: "FF1E293B" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } }
    };
  });

  // Populate Data Rows
  data.forEach((row, rowIndex) => {
    const dataRow = worksheet.addRow(row);
    dataRow.height = 22; // Comfortable visual height

    const isEven = rowIndex % 2 === 0;
    const cellBgColor = isEven ? "FFF8FAFC" : "FFFFFFFF"; // Alternating white/slate-50 background

    dataRow.eachCell((cell) => {
      cell.font = {
        name: "Segoe UI",
        size: 10,
        color: { argb: "FF0F172A" }
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: cellBgColor }
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: false
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };

      // Detect hyperlinks and format them natively as clickable blue underline elements in Excel
      const cellValue = cell.value;
      if (
        typeof cellValue === "string" &&
        (cellValue.startsWith("http://") || cellValue.startsWith("https://"))
      ) {
        cell.value = {
          text: cellValue,
          hyperlink: cellValue
        };
        cell.font = {
          name: "Segoe UI",
          size: 10,
          color: { argb: "FF2563EB" }, // Royal blue color
          underline: true,
          bold: true
        };
      }
    });
  });

  // Add Spacious Blank Row
  worksheet.addRow([]);

  // Add Elegant Institutional Footnote Row
  const footerText = `Rapport d'Établissements Français Généré par Around Me Pro le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} | Sources de données : DINUM / BAN API / INSEE.`;
  const footerRow = worksheet.addRow([footerText]);
  footerRow.height = 22;

  // Merge footer cells across all columns to act as a seamless table footer
  worksheet.mergeCells(footerRow.number, 1, footerRow.number, columns.length);

  const footerCell = footerRow.getCell(1);
  footerCell.font = {
    name: "Segoe UI",
    size: 9,
    italic: true,
    color: { argb: "FF475569" } // soft slate-600
  };
  footerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" } // slate-100 background
  };
  footerCell.alignment = {
    vertical: "middle",
    horizontal: "left"
  };
  footerCell.border = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } }
  };

  // Write workbook binary payload and trigger client-side download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
