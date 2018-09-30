# CONTRIBUTING

## Directory Structure

- README.md: This.
- **src**: Includes source codes (TypeScript, CSS, etc.) and unit testing codes. ``*.spec.*`` files are for unit testing.
    - **core**: Includes platform-agnostic modules to mainly parse/evaluate friends-lang scripts.
    - **client**: Includes source codes and assets for front-end.
- **dist**: Includes compilation outputs (JavaScript, CSS, etc.)
    - **client**: Includes static files to be served.

## Architecture

- **React**: UI rendering framework for web.
- **Webpack** : Module bundler.
    - Resolves `import`/`export` and bundles all TypeScript/Vue files into one javascript file named `index.js`.
- **Mocha**: Unit test runner.
    - Executes test codes.
    - Is NOT aware of TypeScript/React/etc. Just watches webpack's bundles.

## Development Environment Construction

- Install NodeJS (>= 8.6).
- Install Yarn, the package manager.
- Inside `src`, run this command: `yarn`.

Some commands are defined in `package.json` (npm scripts).

```sh
# Start compiler and test tools.
# Serve outputs at http://127.0.0.1:5000 .

yarn run dev
```

```sh
# Build output.
yarn run prod
```
