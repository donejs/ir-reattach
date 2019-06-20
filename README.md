# done-ssr-incremental-rendering-client

[![Build Status](https://travis-ci.org/donejs/done-ssr-incremental-rendering-client.svg?branch=master)](https://travis-ci.org/donejs/done-ssr-incremental-rendering-client) [![Greenkeeper badge](https://badges.greenkeeper.io/donejs/ir-reattach.svg)](https://greenkeeper.io/)

The client code for incremental rendering

## Usage

### ES6 use

With StealJS, you can import this module directly in a template that is autorendered:

```js
import plugin from 'done-ssr-incremental-rendering-client';
```

### CommonJS use

Use `require` to load `done-ssr-incremental-rendering-client` and everything else
needed to create a template that uses `done-ssr-incremental-rendering-client`:

```js
var plugin = require("done-ssr-incremental-rendering-client");
```

### Standalone use

Load the `global` version of the plugin:

```html
<script src='./node_modules/done-ssr-incremental-rendering-client/dist/global/done-ssr-incremental-rendering-client.js'></script>
```
