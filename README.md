# Council Budget Transparency

An open-source project to provide transparency into UK local council budgets, helping residents understand how public money is spent.

## Overview

This tool collects, processes, and visualises council budget data to make it accessible and understandable for everyone.

## Features

- Council budget data collection and processing
- Interactive budget visualisations
- Historical spending comparisons
- Search and filter by council, category, or time period
- Open data exports

## Tech Stack

- **Backend:** Python
- **Data Processing:** Pandas
- **Frontend:** HTML/CSS/JavaScript
- **Database:** Firebase

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend)
- Firebase account

### Installation

```bash
git clone https://github.com/jono8001/council.git
cd council
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the root directory:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
```

### Run

```bash
python main.py
```

## Project Structure

```
council/
├── src/              # Source code
│   ├── scrapers/     # Data collection scripts
│   ├── processing/   # Data cleaning and transformation
│   └── api/          # API endpoints
├── frontend/         # Web frontend
├── data/             # Raw and processed data
├── tests/            # Test files
├── .env.example      # Environment variable template
├── requirements.txt  # Python dependencies
└── README.md
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Licence

MIT License
