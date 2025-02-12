(function (g) {
    if (g.FormData) {
        return;
    }

    const INIT_BUFFER_SIZE = 256;

    function Buffer() {
        this.buffer = new ArrayBuffer(INIT_BUFFER_SIZE);
        this.writer = new Uint8Array(this.buffer);
        this.byteLength = 0;
    }

    /**
     * @param {string | number[]} data
     * @returns
     */
    Buffer.prototype.append = function(data) {
        if (typeof data === 'string') {
            this._ensureCapacity(data.length);

            for (let i = 0; i < data.length; i++) {
                const c = data.charCodeAt(i);
                if (c > 0xFF) {
                    throw new Error('Only ASCII characters are supported');
                }

                this.writer[this.byteLength++] = c;
            }

            return;
        }

        if (data.buffer instanceof ArrayBuffer) {
            data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

            this._ensureCapacity(data.length);
            this.writer.set(data, this.byteLength);
            this.byteLength += data.byteLength;
            return;
        }

        if (!Array.isArray(data)) {
            throw new Error('Invalid data type, FormData only supports string, ArrayBuffer, or Array of bytes.');
        }

        this._ensureCapacity(data.length);
        this.writer.set(data, this.byteLength);
        this.byteLength += data.length;
    }

    Buffer.prototype.data = function() {
        return this.buffer.slice(0, this.byteLength);
    }

    /**
     * @param {number} extraSize
     * @returns
     */
    Buffer.prototype._ensureCapacity = function(extraSize) {
        let newSize = this.byteLength + extraSize;
        if (this.buffer.byteLength > newSize) {
            return;
        }

        newSize = Math.max(newSize, Math.floor(this.buffer.byteLength * 1.75));
        let newBuffer;
        try {
            newBuffer = new ArrayBuffer(newSize);
        } catch (err) {
            throw new Error('Failed to allocate buffer of size ' + newSize);
        }

        const oldWriter = new Uint8Array(this.buffer);
        const newWriter = new Uint8Array(newBuffer);
        newWriter.set(oldWriter);
        this.buffer = newBuffer;
        this.writer = newWriter;
    }


    function FormData() {
        /** @type {Record<string, ({ data: string | number[]; filename?: string })[]>} */
        this._fields = {};
    }

    /**
     * @param {string} name
     * @param {string | number | number[]} value
     * @param {string | undefined} [filename]
     */
    FormData.prototype.set = function (name, value, filename) {
        this._fields[name] = [{ data: value, filename: filename }];
    }

    /**
     * @param {string} name
     * @param {string | number | number[]} value
     * @param {string | undefined} [filename]
     */
    FormData.prototype.append = function(name, value, filename) {
        if (this._fields[name]) {
            this._fields[name].push({ data: value, filename: filename });
        } else {
            this._fields[name] = [{ data: value, filename: filename }];
        }
    }

    /**
     * @param {string} name
     */
    FormData.prototype.delete = function (name) {
        delete this._fields[name];
    }

    /**
     * @param {string} name
     * @returns {string | number | number[] | undefined}
     */
    FormData.prototype.get = function(name) {
        const field = this._fields[name];
        if (field && field[0]) {
            return field[0].data;
        }
    }

    /**
     * @param {string} name
     * @returns {(string | number[])[]}
     */
    FormData.prototype.getAll = function(name) {
        const field = this._fields[name];
        if (field) {
            return field.map(f => f.data);
        }

        return [];
    }

    /**
     * @param {string} name
     * @returns {boolean}
     */
    FormData.prototype.has = function(name) {
        return !!this._fields[name];
    }

    //     keys() {
    //         return Object.keys(this._fields);
    //     }

    //     values() {
    //         return Object.values(this._fields).map(f => f[0].data);
    //     }

    //     entries() {
    //         return Object.entries(this._fields).map(([name, value]) => [name, value[0].data]);
    //     }

    FormData.prototype.toBuffer = function() {
        const boundary = '----CocosFormDataPolyfill' + Math.floor(Math.random() * 1000000);
        const buffer = new Buffer();

        for (let name in this._fields) {
            const values = this._fields[name];
            for (let i = 0; i < values.length; i++) {
                const data = values[i].data;
                const filename = values[i].filename;

                buffer.append('--' + boundary +'\r\n');
                buffer.append('Content-Disposition: form-data; name="' + name + '"');
                if (filename) {
                    buffer.append('; filename="' + filename + '"');
                }
                buffer.append('\r\n');

                if (typeof data !== 'string') {
                    buffer.append('Content-Type: application/octet-stream\r\n');
                }

                buffer.append('\r\n');
                buffer.append(data);
                buffer.append('\r\n');
            }
        }

        buffer.append('--' + boundary +'--\r\n');
        return { data: buffer.data(), boundary: boundary };
    }

    g.FormData = FormData;
})(window);
