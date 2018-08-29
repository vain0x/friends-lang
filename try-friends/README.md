# try-friends

*Under development*

A web app to try Friends-lang.

## Directory Structure

- **try-friends**
    - README.md: This.
    - **src**: Includes source codes (TypeScript, SCSS, etc.) and unit-test codes. ``*.spec.*`` files are for unit testing.
        - **core**: Includes modules written in TypeScript to parse/evaluate friends-lang scripts.
        - **client**: Includes source codes and resources for front-end of **try-friends** web app.
    - **test**: Includes integrated test codes.
    - **dist**: Includes compilation outputs (JavaScript, CSS, etc.) So not tracked with Git.
        - **client**: Includes static files to be served.

## Architecture

- **Vue.js** 2: UI rendering framework for front-end.
- **Webpack** 3: Module bundler.
    - Resolves `import`/`export` and bundles all TypeScript/Vue files into one javascript file named `index.js`.
- **Karma**: Unit test runner.
    - Executes test codes in a browser.
    - Is NOT aware of TypeScript/Vue/etc. Just watches webpack's bundles.

## Notes for Development

```sh
# Start compiler and test tools in background.
# Serve at http://127.0.0.1:5000 .

npm run dev &
```
