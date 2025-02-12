
# Sentry Javascript ES5 Builder

This project provides a setup to build Sentry into ES5-compatible JavaScript files for use in older browsers environments. It uses TypeScript Compiler (TSC) and Terser to handle the build process and package the output files.

## Features
- Converts Sentry-Javascript source code to ES5 for compatibility with older browsers environments.
- Produces CDN-ready bundles similar to Sentry's official bundles.

## Requirements
Make sure you have the following installed:

- Node.js (>= 14.x)
- npm (comes with Node.js)

## Installation
Clone the repository and install the dependencies:

```
git clone https://github.com/duyquangnvx/sentryjs-es5

cd sentryjs-es5

npm install
```

## Build Instructions
The project uses tsc and terser to compile and bundle the code.

Run the following command to compile the TypeScript source files and bundle them with Terser:

```
npm run build
```

The final output file will be located in the dist/sentry.js.

## Usage in Project
Once the build is complete, you can include the generated ES5 bundle in your project.
This makes the Sentry Javascript ES5 library available globally as Sentry. You can initialize Sentry like this:

```js
Sentry.init({
  dsn: 'https://example@sentry.io/123456',
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

## How to upgrade Sentry SDK
- Download Sentry CDN Bundle from https://browser.sentry-cdn.com/<version>/bundle.js. See https://docs.sentry.io/platforms/javascript/install/loader/#cdn for more information
- Replace your downloaded bundle with src/sentry/bundle.js
