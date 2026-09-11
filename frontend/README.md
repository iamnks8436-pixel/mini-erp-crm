# Mini ERP + CRM — Frontend Web Application

React 19 + TypeScript + Vite single-page application for the Mini ERP + CRM Operations Portal.

## Features
- Role-based routing with route guards (`Admin`, `Sales`, `Warehouse`, `Accounts`)
- 1-Click demo authentication quick-switcher on `/login`
- Real-time inventory status badges and stock warnings
- Interactive delivery challan generation with live stock availability verification
- Printable delivery challan document format

## Available Scripts
- `npm run dev`: Start Vite development server (default port 5173 with `/api` proxy to port 5000)
- `npm run build`: Compile TypeScript and build production bundle into `dist/`
- `npm run preview`: Locally preview the production build
