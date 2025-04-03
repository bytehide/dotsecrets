#!/usr/bin/env bash

# ---------------------------------------------------------------------------
# setup-express-example.sh
# ---------------------------------------------------------------------------
# This script creates a minimal "express-example" repository demonstrating:
# 1. A simple Express.js server.
# 2. Usage of .env variables with process.env.
# 3. Excluding .env and node_modules from Git.
#
# Usage:
#   chmod +x setup-express-example.sh
#   ./setup-express-example.sh
# ---------------------------------------------------------------------------

# 1. Create and enter the "express-example" folder
mkdir ./express-example
cd ./express-example || exit 1

# 2. Initialize a new npm package (silently)
npm init -y

# 3. Install express and dotenv
npm install express dotenv

# 4. Create a minimal .gitignore
cat <<EOF > .gitignore
node_modules
.env
EOF

# 5. Create a .env file with example variables
cat <<EOF > .env
PORT=3000
SECRET_KEY=MY_SUPER_SECRET
EOF

# 6. Create a simple server.js that uses dotenv + express
cat <<EOF > server.js
require('dotenv').config();
const express = require('express');
const app = express();

const port = process.env.PORT || 3000;
const secret = process.env.SECRET_KEY || "No secret found";

app.get('/', (req, res) => {
  res.send(\`Hello from express. SECRET_KEY is: \${secret}\`);
});

app.listen(port, () => {
  console.log(\`Server listening on port \${port}\`);
});
EOF

# 7. Overwrite package.json to add a start script
cat <<EOF > package.json
{
  "name": "express-example",
  "version": "1.0.0",
  "description": "Minimal Express.js example using process.env and .env",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "keywords": [
    "express",
    "dotenv",
    "example"
  ],
  "author": "YourName",
  "license": "MIT",
  "dependencies": {
    "dotenv": "^16.0.0",
    "express": "^4.18.2"
  }
}
EOF

# 8. Create a minimal README
cat <<EOF > README.md
# Express Example

This is a minimal Express.js application that demonstrates:
- Reading environment variables from a \`.env\` file using \`dotenv\`.
- Excluding sensitive files (\`.env\`) from version control with \`.gitignore\`.

## Usage

1. Install dependencies:

\`\`\`bash
npm install
\`\`\`

2. Create or edit the \`.env\` file:

\`\`\`dotenv
PORT=3000
SECRET_KEY=MY_SUPER_SECRET
\`\`\`

3. Run the server:

\`\`\`bash
npm start
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Files

- \`.env\` - Contains environment variables (not committed to git).
- \`server.js\` - Main Express server reading \`SECRET_KEY\` from \`.env\`.
- \`package.json\` - Project metadata and start script.

Enjoy!
EOF

echo "Express example setup complete!"
echo "Directory structure:"
tree .