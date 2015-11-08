
var Service, Characteristic;
var JSONRequest = require("jsonrequest");

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-domotiga", "Domotiga", Domotiga);
}


//Get data from config file 
function Domotiga(log, config) {
    this.log = log;
    this.config = {
        host: config.host || 'localhost',
        port: config.port || 9090,
        service: config.service || "TempHygroMeter",
        device: config.device || 81,
        name: config.name || NA,
        lowbattery: config.lowbattery || 3000
    };
}

Domotiga.prototype = {
    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },
    getCurrentRelativeHumidity: function (callback) {
        var that = this;
        that.log("getting CurrentRelativeHumidity for " + that.config.name);

////////////////////// Make a request to Domotiga server
//        JSONRequest('http://' + that.config.host + ':' + that.config.port,
//        {
//        jsonrpc: "2.0",
//                method: "domotiga.version",
//                id: 1
//        }, function (err, data) {
//            that.log(err || data);
//
//            that.log("results.result:", data.result);
        JSONRequest('http://' + that.config.host + ':' + that.config.port,
                {
                    jsonrpc: "2.0",
                    method: "device.get",
                    params: {"device_id": that.config.device},
                    id: 1
                }, function (err, data) {

            if (err) {
                that.log("Sorry err: ", err);
                callback(err);
            }
            else {
                //that.log("data.result:", data.result);
                //that.log( "data.result[values][0][value]", data.result[values][0][value]);
                i = 0;
                for (key1 in data.result) {
                    if (i == 37) {
                        //that.log("key1 ", i, key1, "values[key1]", values[key1]);
                        j = 0;
                        for (key2 in data.result[key1]) {
                            if (j == 1) {
                                //that.log("key2 ", j, key2, "values[key1][key2]", values[key1][key2]);
                                k = 0;
                                for (key3 in data.result[key1][key2]) {
                                    if (k == 17) {
                                        //that.log("key3 ", k, key3, "data.result[key1][key2][key3]", data.result[key1][key2][key3]);
                                        callback(null, Number(data.result[key1][key2][key3]));
                                    }
                                    ++k;
                                }
                            }
                            ++j;
                        }
                    }
                    ++i;
                }
            }
        });
    },
    getCurrentTemperature: function (callback) {
        var that = this;
        that.log("getting Temperature for " + that.config.name);

////////////////////// Make a request to Domotiga server 
        JSONRequest('http://' + that.config.host + ':' + that.config.port,
                {
                    jsonrpc: "2.0",
                    method: "device.get",
                    params: {"device_id": that.config.device},
                    id: 1
                }, function (err, data) {

            if (err) {
                that.log("Sorry err: ", err);
                callback(err);
            }
            else {
                //that.log("data.result:", data.result);
                //that.log( "data.result[values][0][value]", data.result[values][0][value]);
                i = 0;
                for (key1 in data.result) {
                    if (i == 37) {
                        //that.log("key1 ", i, key1, "values[key1]", values[key1]);
                        j = 0;
                        for (key2 in data.result[key1]) {
                            if (j == 0) {
                                //that.log("key2 ", j, key2, "values[key1][key2]", values[key1][key2]);
                                k = 0;
                                for (key3 in data.result[key1][key2]) {
                                    if (k == 17) {
                                        //that.log("key3 ", k, key3, "data.result[key1][key2][key3]", data.result[key1][key2][key3]);
                                        callback(null, Number(data.result[key1][key2][key3]));
                                    }
                                    ++k;
                                }
                            }
                            ++j;
                        }
                    }
                    ++i;
                }
            }
        });
    },
    getTemperatureUnits: function (callback) {
        var that = this;
        that.log("getting Temperature unit for " + that.config.name);
        // 1 = F and 0 = C
        callback(null, 0);
    },

    getGetFakeContactState: function (callback) {
        var that = this;
        that.log("getting fake ContactState for " + that.config.name);
        //dbg:
        //value = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;

        // The value property of ContactSensorState must be one of the following:
//Characteristic.ContactSensorState.CONTACT_DETECTED = 0;
//Characteristic.ContactSensorState.CONTACT_NOT_DETECTED = 1;

        callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
    },
    
    getCurrentBatteryLevel: function (callback) {
        var that = this;
        that.log("getting Battery level for " + that.config.name);
        //dbg:
        callback(null, 10);
    },
    getLowBatteryStatus: function (callback) {
        var that = this;
        that.log("getting BatteryStatus for " + that.config.name);

////////////////////// Make a request to Domotiga server
        JSONRequest('http://' + that.config.host + ':' + that.config.port,
                {
                    jsonrpc: "2.0",
                    method: "device.get",
                    params: {"device_id": that.config.device},
                    id: 1
                }, function (err, data) {

            if (err) {
                that.log("Sorry err: ", err);
                callback(err);
            }
            else {
                //that.log("data.result:", data.result);
                //that.log( "data.result[values][0][value]", data.result[values][0][value]);
                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);

                i = 0;
                for (key1 in data.result) {
                    if (i == 37) {
                        //that.log("key1 ", i, key1, "values[key1]", values[key1]);
                        j = 0;
                        for (key2 in data.result[key1]) {
                            if (j == 3) {
                                //that.log("key2 ", j, key2, "values[key1][key2]", values[key1][key2]);
                                k = 0;
                                for (key3 in data.result[key1][key2]) {
                                    if (k == 17) {
                                        //that.log("key3 ", k, key3, "data.result[key1][key2][key3]", data.result[key1][key2][key3]);
                                        if (Number(data.result[key1][key2][key3]) < Number(that.config.lowbattery)) {
                                            callback(null, 1);
                                            //callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);

                                        }
                                        else {
                                            callback(null, 0);
                                            //callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                                        }
                                    }
                                    ++k;
                                }
                            }
                            ++j;
                        }
                    }
                    ++i;
                }
            }
        });
    },
    getServices: function () {
        // you can OPTIONALLY create an information service if you wish to override
        // the default values for things like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();

        if (this.config.service == "TempHygroMeter") {
            informationService
                    .setCharacteristic(Characteristic.Manufacturer, "TinyTX DHT22 Manufacturer")
                    .setCharacteristic(Characteristic.Model, "TinyTX DHT22 Sensor")
                    .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

            var controlService = new Service.TemperatureSensor();

            controlService
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .on('get', this.getCurrentTemperature.bind(this));

            controlService
                    .addCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on('get', this.getCurrentRelativeHumidity.bind(this));

            controlService
                    .addCharacteristic(Characteristic.BatteryLevel)
                    .on('get', this.getCurrentBatteryLevel.bind(this));

            controlService
                    .addCharacteristic(Characteristic.StatusLowBattery)
                    .on('get', this.getLowBatteryStatus.bind(this));

            return [informationService, controlService];
        }

        if (this.config.service == "Contact") {

            informationService
                    .setCharacteristic(Characteristic.Manufacturer, "Contact Manufacturer")
                    .setCharacteristic(Characteristic.Model, "Contact Model")
                    .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

            var controlService = new Service.ContactSensor();

            controlService
                    .getCharacteristic(Characteristic.ContactSensorState)
                    .on('get', this.getGetFakeContactState.bind(this));

            controlService
                    .addCharacteristic(Characteristic.StatusLowBattery)
                    .on('get', this.getLowBatteryStatus.bind(this));

            return [informationService, controlService];
        }
    }
};
