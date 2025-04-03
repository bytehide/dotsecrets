# Express Example

This is a minimal Express.js application that demonstrates:
- Reading environment variables from a `.env` file using `dotenv`.
- Excluding sensitive files (`.env`) from version control with `.gitignore`.

## Usage

1. Install dependencies:

```bash
npm install
```

2. Create or edit the `.env` file:

```dotenv
PORT=3000
SECRET_KEY=MY_SUPER_SECRET
```

3. Run the server:

```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Files

- `.env` - Contains environment variables (not committed to git).
- `server.js` - Main Express server reading `SECRET_KEY` from `.env`.
- `package.json` - Project metadata and start script.

Enjoy!
