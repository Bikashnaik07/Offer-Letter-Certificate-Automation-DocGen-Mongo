# Offer-Letter-Certificate-Automation-DocGen-Mongo-
DocGen-Mongo is a full-stack automation system for generating offer letters, appointment letters, experience letters, and certificates. Built with Node.js, Express, and MongoDB, it supports template management, single &amp; bulk document generation, audit logging, and export to PDF/DOCX.
# DocGen-Mongo: Offer Letter & Certificate Automation

A comprehensive document automation system built with Node.js, Express, and MongoDB for generating offer letters, appointment letters, experience certificates, and other organizational documents.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: React.js with Bootstrap
- **Document Generation**: 
  - PDF: Puppeteer
  - DOCX: docx-templater
- **Authentication**: JWT with bcryptjs
- **File Processing**: Multer, csv-parser, xlsx
- **Email**: Nodemailer (configured for development)

## Features

### Core Functionality
- **Multi-role Authentication** (Admin, HR, Staff)
- **Template Management** with placeholder support
- **Single Document Generation** from templates
- **Bulk Document Generation** from CSV/Excel files
- **Dual Export Formats** (PDF & DOCX)
- **Comprehensive Audit Trail**
- **Email Integration** for document delivery

### Role-based Access Control
- **Admin**: Full system access, user management
- **HR**: Template management, document generation
- **Staff**: Limited document generation access

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/docgen-mongo.git
   cd docgen-mongo
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**
   ```bash
   cd ../backend
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/docgen-mongo
   JWT_SECRET=your-super-secret-jwt-key-here
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

5. **Database Setup**
   ```bash
   # Make sure MongoDB is running
   # Seed the database with sample data
   npm run seed
   ```

6. **Start the application**
   ```bash
   # Start backend server (from backend directory)
   npm start
   
   # Start frontend (from frontend directory, new terminal)
   cd ../frontend
   npm start
   ```

## API Documentation

### Authentication Endpoints
```
POST /api/auth/register - Register new user
POST /api/auth/login    - User login
GET  /api/auth/profile  - Get user profile (protected)
```

### Template Management
```
GET    /api/templates     - Get all templates
POST   /api/templates     - Create new template
PUT    /api/templates/:id - Update template
DELETE /api/templates/:id - Delete template
```

### Document Generation
```
POST /api/documents/generate-single - Generate single document
POST /api/documents/generate-bulk   - Bulk generate from CSV/Excel
GET  /api/documents/audit           - Get audit trail
GET  /api/documents/download/:id    - Download generated document
```

### Sample API Usage

**Login Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@docgen.com",
    "password": "admin123"
  }'
```

**Generate Single Document:**
```bash
curl -X POST http://localhost:5000/api/documents/generate-single \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "TEMPLATE_ID",
    "data": {
      "name": "John Doe",
      "position": "Software Developer",
      "date": "2024-01-15",
      "company": "TechCorp Inc."
    },
    "format": "pdf"
  }'
```

## Project Structure

```
docgen-mongo/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Template.js
│   │   └── GeneratedDoc.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── templateRoutes.js
│   │   └── docRoutes.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── roleCheck.js
│   ├── utils/
│   │   ├── pdfGenerator.js
│   │   ├── docxGenerator.js
│   │   └── emailService.js
│   ├── uploads/
│   ├── generated/
│   ├── seed.js
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.js
│   └── package.json
├── seed/
│   ├── users.json
│   └── templates.json
├── sample-templates/
│   ├── offer_letter.docx
│   └── certificate.docx
├── .env.example
├── package.json
└── README.md
```

## Default Users (After Seeding)

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@docgen.com    | admin123  |
| HR    | hr@docgen.com       | hr123     |
| Staff | staff@docgen.com    | staff123  |

## Template Placeholders

The system supports various placeholders in document templates:

- `{{name}}` - Recipient name
- `{{email}}` - Recipient email
- `{{position}}` - Job position/role
- `{{department}}` - Department name
- `{{salary}}` - Salary information
- `{{joining_date}}` - Joining/start date
- `{{company}}` - Company name
- `{{date}}` - Current/document date
- `{{manager}}` - Reporting manager
- `{{location}}` - Work location

## Demo Video

[Demo Video Placeholder - Will be updated with actual demo]

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- **Document Processing**: Built using Puppeteer for PDF generation and docx-templater for Word documents
- **UI Framework**: Bootstrap for responsive design
- **Database**: MongoDB for scalable document storage
- **Authentication**: JWT-based secure authentication system

---

**Built with for efficient document automation**
