// jshint ignore: start

const stealTools = require("steal-tools");

async function run() {
	await stealTools.export({
		steal: {
			config: __dirname + "/package.json!npm"
		},
		options: {
			noProcessShim: true
		},
		outputs: {
			"+bundled-es": {
				dest: __dirname + "/ir-reattach.mjs",
				removeDevelopmentCode: false
			},
			"+bundled-es minified": {
				dest: __dirname + "/ir-reattach.min.mjs",
				minify: true
			}
		}
	});

	await stealTools.export({
		steal: {
			config: __dirname + "/package.json!npm",
			"main": "done-mutation/encoder"
		},
		options: {
			noProcessShim: true
		},
		outputs: {
			"+bundled-es": {
				dest: __dirname + "/test/encoder.mjs"
			}
		}
	});
}

run().catch(err => console.error(err));
