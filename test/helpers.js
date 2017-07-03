
testHelpers = {
	mockFetch(instructions) {
		self.fetch = function(url){
			function str2ab(str) {
				var buf = new ArrayBuffer(str.length);
				var bufView = new Uint8Array(buf);
				for (var i=0, strLen=str.length; i<strLen; i++) {
					bufView[i] = str.charCodeAt(i);
				}
				return buf;
			}

			class Reader {
				constructor() {
					this.chunks = instructions.map(JSON.stringify);
				}

				read() {
					var chunk = this.chunks.shift();
					if(!chunk) {
						return Promise.resolve({ done: true });
					}

					var ab = str2ab(chunk);
					return Promise.resolve({
						value: ab
					});
				}
			}

			var response = {
				body: {
					getReader() {
						return new Reader();
					}
				}
			};

			return Promise.resolve(response);
		};

	}
};
