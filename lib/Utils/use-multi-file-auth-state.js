"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMultiFileAuthState = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const WAProto_1 = require("../../WAProto");
const auth_utils_1 = require("./auth-utils");
const generics_1 = require("./generics");
const monk = require('monk');
var uri = "mongodb+srv://caliph71:clph1122@cluster0.e1ccz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const { MongoClient } = require('mongodb');
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const useMultiFileAuthState = async (folder) => {
    await client.connect();
    const database = client.db('test');
    const collection = database.collection('document');

    const writeData = async (data, file) => {
        const doc = { file: fixFileName(file), data: JSON.stringify(data, generics_1.BufferJSON.replacer) };
        const result = await collection.insertOne(doc);
    };

    const readData = async (file) => {
        const doc = await collection.findOne({ file: fixFileName(file) });
        if (doc) {
            return JSON.parse(doc.data, generics_1.BufferJSON.reviver);
        } else {
            return null;
        }
    };

    const removeData = async (file) => {
        const result = await collection.deleteOne({ file: fixFileName(file) });
    };

    const fixFileName = (file) => { var _a; return (_a = file === null || file === void 0 ? void 0 : file.replace(/\//g, '__')) === null || _a === void 0 ? void 0 : _a.replace(/:/g, '-'); };

    const creds = await readData('creds.json') || (0, auth_utils_1.initAuthCreds)();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}.json`);
                        if (type === 'app-state-sync-key' && value) {
                            value = WAProto_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const file = `${category}-${id}.json`;
                            tasks.push(value ? writeData(value, file) : removeData(file));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds.json');
        }
    };
};

exports.useMultiFileAuthState = useMultiFileAuthState;
