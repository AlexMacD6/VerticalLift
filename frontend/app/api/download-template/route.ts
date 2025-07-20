import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'annual';
    // SKU Master Data columns
    const skuColumns = [
      { header: 'SKU', key: 'sku', width: 20, def: 'Unique identifier for each product.' },
      { header: 'Product Name', key: 'product_name', width: 40, def: 'Human-readable name or label for the product.' },
      { header: 'Length (in)', key: 'length_in', width: 18, def: 'Longest horizontal dimension of the product, in inches.' },
      { header: 'Width (in)', key: 'width_in', width: 18, def: 'Secondary horizontal dimension of the product, in inches.' },
      { header: 'Height (in)', key: 'height_in', width: 18, def: 'Vertical dimension (thickness) of the product, in inches.' },
      { header: 'Weight (lb)', key: 'weight_lb', width: 18, def: 'Weight of a single unit, in pounds.' },
      { header: 'In Stock', key: 'in_stock', width: 18, def: 'Current quantity of this SKU available in inventory.' },
      { header: 'Annual Sales', key: 'annual_sales', width: 18, def: 'Total number of units sold over the past 12 months.' },
    ];
    // Daily Sales Data columns
    const dailyColumns = [
      { header: 'Date', key: 'date', width: 20, def: 'Date of sale (YYYY-MM-DD).' },
      { header: 'SKU', key: 'sku', width: 25, def: 'SKU identifier for the product sold.' },
      { header: 'Units Sold', key: 'units_sold', width: 18, def: 'Number of units sold on this date.' },
    ];
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Tray Optimizer MVP';
    wb.created = new Date();
    // --- SKU Master Data Sheet ---
    const wsSKU = wb.addWorksheet('SKU Master');
    wsSKU.mergeCells(1, 1, 1, skuColumns.length);
    wsSKU.getCell('A1').value = 'Tray Optimizer SKU Master Data';
    wsSKU.getCell('A1').font = { name: 'Poppins', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    wsSKU.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    wsSKU.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF3D' },
    };
    wsSKU.getRow(1).height = 32;
    wsSKU.mergeCells(2, 1, 2, skuColumns.length);
    wsSKU.getCell('A2').value = 'Fill out the SKU master details below. Do not modify the column headers. Definitions for each column header are located on the Definitions sheet.';
    wsSKU.getCell('A2').font = { name: 'Poppins', size: 10, italic: true, color: { argb: 'FF825E08' } };
    wsSKU.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    wsSKU.getRow(2).height = 25;
    wsSKU.getRow(3).values = skuColumns.map(col => col.header);
    wsSKU.getRow(3).font = { name: 'Poppins', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    wsSKU.getRow(3).height = 50;
    for (let col = 1; col <= skuColumns.length; col++) {
      const cell = wsSKU.getCell(3, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4AF3D' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF825E08' } },
        left: { style: 'thin', color: { argb: 'FF825E08' } },
        bottom: { style: 'thin', color: { argb: 'FF825E08' } },
        right: { style: 'thin', color: { argb: 'FF825E08' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
    wsSKU.columns = skuColumns.map(col => ({ key: col.key, width: col.width }));
    wsSKU.addRow({
      sku: 'SKU0001',
      product_name: 'Widget A',
      length_in: 12.5,
      width_in: 8.0,
      height_in: 3.2,
      weight_lb: 2.1,
      in_stock: 150,
      annual_sales: 1200,
    });
    wsSKU.addRow({
      sku: 'SKU0002',
      product_name: 'Gadget B',
      length_in: 10.0,
      width_in: 6.5,
      height_in: 2.8,
      weight_lb: 1.7,
      in_stock: 80,
      annual_sales: 900,
    });

    // 3. Pre-format rows (up to 500) with alternating colors and borders for SKU Master
    for (let rowNumber = 4; rowNumber <= 500; rowNumber++) {
      const isEvenRow = (rowNumber - 3) % 2 === 0;
      const backgroundColor = isEvenRow ? 'FFF8F8F8' : 'FFFFFFFF';
      const row = wsSKU.getRow(rowNumber);
      
      for (let col = 1; col <= skuColumns.length; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      row.font = { name: 'Poppins', size: 10 };
    }
    // 4. Ensure header row (row 3) formatting is preserved
    for (let col = 1; col <= skuColumns.length; col++) {
      wsSKU.getCell(3, col).border = {
        top: { style: 'thick', color: { argb: 'FF825E08' } },
        left: { style: 'thin', color: { argb: 'FF825E08' } },
        bottom: { style: 'thin', color: { argb: 'FF825E08' } },
        right: { style: 'thin', color: { argb: 'FF825E08' } },
      };
    }
    // 5. Freeze the top three rows instead of protecting them
    wsSKU.views = [
      {
        state: 'frozen',
        ySplit: 3,
        xSplit: 0,
        showGridLines: true,
        showRowColHeaders: true,
        showRuler: true
      }
    ];
    // --- Daily Sales Data Sheet (only for type=daily) ---
    if (type === 'daily') {
      const wsDaily = wb.addWorksheet('Daily Sales');
      wsDaily.mergeCells(1, 1, 1, dailyColumns.length);
      wsDaily.getCell('A1').value = 'Tray Optimizer Daily Sales Data';
      wsDaily.getCell('A1').font = { name: 'Poppins', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
      wsDaily.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      wsDaily.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4AF3D' },
      };
      wsDaily.getRow(1).height = 32;
      wsDaily.mergeCells(2, 1, 2, dailyColumns.length);
      wsDaily.getCell('A2').value = 'Fill out the daily sales data below. Each row should represent a single SKU sale on a specific date.';
      wsDaily.getCell('A2').font = { name: 'Poppins', size: 10, italic: true, color: { argb: 'FF825E08' } };
      wsDaily.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      wsDaily.getRow(2).height = 25;
      wsDaily.getRow(3).values = dailyColumns.map(col => col.header);
      wsDaily.getRow(3).font = { name: 'Poppins', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      wsDaily.getRow(3).height = 50;
      for (let col = 1; col <= dailyColumns.length; col++) {
        const cell = wsDaily.getCell(3, col);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD4AF3D' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF825E08' } },
          left: { style: 'thin', color: { argb: 'FF825E08' } },
          bottom: { style: 'thin', color: { argb: 'FF825E08' } },
          right: { style: 'thin', color: { argb: 'FF825E08' } },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
      wsDaily.columns = dailyColumns.map(col => ({ key: col.key, width: col.width }));
      wsDaily.addRow({ date: '2024-06-01', sku: 'SKU0001', units_sold: 5 });
      wsDaily.addRow({ date: '2024-06-01', sku: 'SKU0002', units_sold: 2 });
      wsDaily.addRow({ date: '2024-06-02', sku: 'SKU0001', units_sold: 3 });
      wsDaily.addRow({ date: '2024-06-02', sku: 'SKU0002', units_sold: 4 });

      // 3. Pre-format a large range of rows (up to 50,000) with alternating colors and borders
      for (let rowNumber = 4; rowNumber <= 50000; rowNumber++) {
        const isEvenRow = (rowNumber - 3) % 2 === 0;
        const backgroundColor = isEvenRow ? 'FFF8F8F8' : 'FFFFFFFF';
        const row = wsDaily.getRow(rowNumber);
        
        for (let col = 1; col <= dailyColumns.length; col++) {
          const cell = row.getCell(col);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: backgroundColor },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          // Set date format for column A (Date column)
          if (col === 1) {
            cell.numFmt = 'mm/dd/yyyy';
          }
        }
        row.font = { name: 'Poppins', size: 10 };
      }
      // 4. Ensure header row (row 3) formatting is preserved
      for (let col = 1; col <= dailyColumns.length; col++) {
        wsDaily.getCell(3, col).border = {
          top: { style: 'thick', color: { argb: 'FF825E08' } },
          left: { style: 'thin', color: { argb: 'FF825E08' } },
          bottom: { style: 'thin', color: { argb: 'FF825E08' } },
          right: { style: 'thin', color: { argb: 'FF825E08' } },
        };
      }
      // 5. Freeze the top three rows instead of protecting them
      wsDaily.views = [
        {
          state: 'frozen',
          ySplit: 3,
          xSplit: 0,
          showGridLines: true,
          showRowColHeaders: true,
          showRuler: true
        }
      ];
    }
    // --- Definitions Sheet ---
    const wsDef = wb.addWorksheet('Definitions');
    wsDef.getCell('A1').value = 'Field';
    wsDef.getCell('B1').value = 'Definition';
    wsDef.getRow(1).font = { name: 'Poppins', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    wsDef.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsDef.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF3D' },
    };
    wsDef.getRow(1).border = {
      bottom: { style: 'thick', color: { argb: 'FF825E08' } },
    };
    wsDef.getColumn(1).width = 20;
    wsDef.getColumn(2).width = 80;
    skuColumns.forEach((col, idx) => {
      wsDef.getCell(`A${idx + 2}`).value = col.header;
      wsDef.getCell(`B${idx + 2}`).value = col.def;
      wsDef.getCell(`A${idx + 2}`).font = { name: 'Poppins', size: 11 };
      wsDef.getCell(`B${idx + 2}`).font = { name: 'Poppins', size: 11 };
      wsDef.getCell(`A${idx + 2}`).alignment = { vertical: 'middle', horizontal: 'left' };
      wsDef.getCell(`B${idx + 2}`).alignment = { vertical: 'middle', horizontal: 'left' };
    });
    if (type === 'daily') {
      let offset = skuColumns.length + 2;
      dailyColumns.forEach((col, idx) => {
        wsDef.getCell(`A${offset + idx}`).value = col.header;
        wsDef.getCell(`B${offset + idx}`).value = col.def;
        wsDef.getCell(`A${offset + idx}`).font = { name: 'Poppins', size: 11 };
        wsDef.getCell(`B${offset + idx}`).font = { name: 'Poppins', size: 11 };
        wsDef.getCell(`A${offset + idx}`).alignment = { vertical: 'middle', horizontal: 'left' };
        wsDef.getCell(`B${offset + idx}`).alignment = { vertical: 'middle', horizontal: 'left' };
      });
    }
    // Write to buffer
    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Tray_Optimizer_Inventory_Template.xlsx"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: `Failed to generate template: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 