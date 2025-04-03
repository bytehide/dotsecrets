import { secrets , preloadAllSecrets} from "../../dist/index.js";

import express from "express";
const app = express();

await preloadAllSecrets(".");

const secretito = await secrets.KIKE.required();

console.log("el secreto KIKE tiene valor de:", secretito)


//console.log("port public", secrets.PUBLIC_PORT.number()
/*.number()
.required()
.between(100, 200)*/
/*
const token = await secrets.TOKEN
  .required()
  .trim()
  .notEmpty()
  .regex(/^[-a-z0-9]+$/i, "Token must be alphanumeric")
  .toUpperCase();

console.log("Token is:", token);

// 2) Converting to number and validating
const port2 = await secrets.PORT
  .number()
  .required()
  .between(100, 20000);

console.log("Port is:", port2);

// 3) Boolean usage
const debug = await secrets.DEBUG
  .boolean()
  .true();

console.log("Debug mode:", debug);


/*
console.log("ramon tiene valor de: ", await secrets.RAMON)
const port = process.env.PORT || 3000;
const secret = process.env.SECRET_KEY || "No secret found";
*/

/*
const pakito =  secrets.PORT;

console.log("el secreto 2 tiene valor de:",pakito)
*/

//const port = secrets.PUBLIC_PORT.number().between(100, 6000) || 3000;

//console.log("el secreto tiene valor de: ", port)

//const secret = process.env.SECRET_KEY || "No secret found";
/*
app.get('/', (req, res) => {
  res.send(`Hello from express. SECRET_KEY is: ${secret}`);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
*/