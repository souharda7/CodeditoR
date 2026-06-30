# CodeditoR: High-Performance Cloud Workspace

CodeditoR is a secure, browser-based integrated development environment (IDE) that provides isolated cloud-based compilation and execution for Python and C++ code. Designed for competitive programmers and developers, it offers low-latency execution and persistent local workspace storage.

## Key Features

*   **Cloud Execution Engine**: Secure, containerized execution environment for Python and C++.
*   **Dual-Language Support**: Seamless switching between Python 3.11 and C++ (g++).
*   **Keyboard-First Workflow**: Pro-level shortcuts for rapid development (Ctrl + Enter to run, Ctrl + S to save).
*   **Persistent Storage**: Automatic local synchronization so your code survives browser refreshes.
*   **Secure Auth**: JWT-based authentication with a built-in password reset flow.

## Tech Stack

*   **Frontend**: React.js, Monaco Editor, Axios, Tailwind CSS, Lucide Icons.
*   **Backend**: FastAPI, SQLAlchemy, Neon (PostgreSQL), Python subprocess.
*   **Infrastructure**: Vercel (Frontend Hosting), Render (Backend API Service).

## Project Structure

```text
CodeditoR/
├── backend/          # FastAPI server and execution logic
├── frontend/         # React client and Monaco editor integration
├── .gitignore        # Shared environment and dependency exclusion
└── README.md
```

## Local Development

### Prerequisites

*   Node.js (for frontend)
*   Python 3.x (for backend)

### Setup

1.  **Clone the repository**:
    ```bash
    git clone [https://github.com/souharda7/CodeditoR](https://github.com/souharda7/CodeditoR)
    cd CodeditoR
    ```

2.  **Backend**:
    ```bash
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```

3.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## License

This project is open-source and intended for educational use.
