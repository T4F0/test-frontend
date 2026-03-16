# Form Builder Frontend

A React Router v7 interface for creating and submitting dynamic forms.

## Features

- **Form Management** - Create, edit, and delete forms
- **Section Builder** - Organize forms into sections
- **Field Builder** - Add fields with multiple types (text, number, date, select, checkbox, file)
- **Form Submission** - Submit forms with validation
- **Responsive Design** - Mobile-friendly interface

## Setup

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm build
```

## API Integration

The frontend expects the Django backend to be running on `http://localhost:8000`.

Update `vite.config.js` if your backend is on a different URL.

## Project Structure

```
src/
├── main.jsx              # Application entry point
├── App.jsx               # Main routing component
├── pages/                # Page components
│   ├── FormsList.jsx     # List all forms
│   ├── FormBuilder.jsx   # Create/edit forms
│   └── FormSubmission.jsx # Submit forms
├── components/           # Reusable components
│   ├── Layout.jsx        # Main layout with navbar
│   ├── SectionBuilder.jsx # Section management
│   ├── FieldBuilder.jsx   # Field management
│   └── FormField.jsx     # Form input rendering
├── api/                  # API integration
│   ├── formsApi.js       # Form API calls
│   ├── sectionsApi.js    # Section API calls
│   ├── fieldsApi.js      # Field API calls
│   └── submissionsApi.js # Submission API calls
└── index.css             # Global styles
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
