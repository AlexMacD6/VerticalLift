# Tray Optimizer MVP

A minimal full-stack application for optimizing warehouse tray allocation based on inventory data.

## Features

- Upload and edit inventory CSV files
- Configure tray parameters (dimensions, weight limits, number of trays)
- Optimize tray allocation using Python backend
- View and download optimization results

## Quick Start

### Prerequisites

1. **Python 3.8+**: Install from [python.org](https://www.python.org/downloads/) or Microsoft Store
2. **Node.js 18+**: Install from [nodejs.org](https://nodejs.org/)

### Option 1: Automated Setup (Windows)

Run one of these scripts from the project root:

```powershell
# PowerShell
.\setup.ps1

# Or Command Prompt
setup.bat
```

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload --port 8000
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## CSV Schema

Your inventory CSV should have the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `sku` | string | Stock Keeping Unit identifier |
| `length_in` | number | Item length in inches |
| `width_in` | number | Item width in inches |
| `height_in` | number | Item height in inches |
| `weight_lb` | number | Item weight in pounds |
| `quantity` | number | Total quantity available |
| `annual_sales_units` | number | Annual sales volume (optional) |
| `daily_picks` | number | Daily pick frequency (for optimization priority) |

**Note**: The system can handle CSVs with either `daily_picks` or `annual_sales_units` columns. If only `annual_sales_units` is provided, it will be converted to daily picks for optimization.

### Sample CSV

```csv
sku,length_in,width_in,height_in,weight_lb,quantity,annual_sales_units,daily_picks
SKU001,6.3,5.9,3.6,6.1,170,441,2
SKU002,18.4,5.2,4.9,2.0,193,353,1
SKU003,10.6,6.8,2.1,6.4,143,299,1
```

## API Contract

### POST /optimize

Optimizes tray allocation based on uploaded inventory and parameters.

**Request:**
- `file`: CSV file upload
- `tray_length_in`: Tray length in inches (default: 156)
- `tray_width_in`: Tray width in inches (default: 36)
- `tray_depth_in`: Tray depth in inches (default: 18)
- `num_trays`: Number of available trays (default: 20)
- `weight_limit_lb`: Weight limit per tray in pounds (default: 2205)

**Response:**
```json
{
  "plan": [
    {
      "tray": 1,
      "sku": "SKU001",
      "qty_allocated": 50,
      "tray_weight_lb": 125.0
    }
  ]
}
```

## Default Parameters

- Tray Length: 156 inches
- Tray Width: 36 inches
- Tray Depth: 18 inches
- Number of Trays: 20
- Weight Limit: 2205 lbs

## Technology Stack

- **Backend**: FastAPI + Pandas
- **Frontend**: Next.js 14 (React 18) + TypeScript + Tailwind CSS
- **Communication**: REST API with JSON responses

## Development

### Project Structure

```
tray-optimizer/
├─ backend/
│   ├─ app.py              # FastAPI application
│   ├─ optimiser.py        # Optimization logic
│   └─ requirements.txt    # Python dependencies
├─ frontend/
│   ├─ app/                # Next.js app router
│   │   ├─ page.tsx        # Main UI
│   │   └─ components/     # React components
│   └─ package.json        # Node.js dependencies
└─ README.md
```

## TODO

- [ ] Hook UploadBox and ParamForm into the same POST /optimize
- [ ] Add client-side validation & sample CSV download link
- [ ] Package inventories/tray plans for download (Blob → .csv)
- [ ] Deploy: Render.com / Railway (backend) + Vercel (frontend) #   V e r t i c a l L i f t  
 