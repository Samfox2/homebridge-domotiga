var Service, Characteristic;
var JSONRequest = require("jsonrequest");
var inherits = require('util').inherits;

// Get data from config file 
function Domotiga(log, config) {
    this.log = log;
    this.config = {
        host: config.host || 'localhost',
        port: config.port || 9090,
        service: config.service,
        device: config.device,
        manufacturer: config.manufacturer,
        model: config.model,
        valueTemperature: config.valueTemperature,
        valueHumidity: config.valueHumidity,
        valueAirPressure: config.valueAirPressure,
        valueBattery: config.valueBattery,
        valueContact: config.valueContact,
        valueSwitch: config.valueSwitch,
        valueAirQuality: config.valueAirQuality,
        valueOutlet: config.valueOutlet,
        valueLeakSensor: config.valueLeakSensor,
        valueMotionSensor: config.valueMotionSensor,
        valuePowerConsumption: config.valuePowerConsumption,
        valueTotalPowerConsumption: config.valueTotalPowerConsumption,
        pollInMs: config.pollInMs,
        name: config.name || NA,
        lowbattery: config.lowbattery
    };
}

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    ////////////////////////////// Custom characteristics //////////////////////////////
    EvePowerConsumption = function () {
        Characteristic.call(this, 'Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "watts",
            maxValue: 1000000000,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EvePowerConsumption, Characteristic);

    EveTotalPowerConsumption = function () {
        Characteristic.call(this, 'Total Consumption', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.FLOAT, // Deviation from Eve Energy observed type
            unit: "kilowatthours",
            maxValue: 1000000000,
            minValue: 0,
            minStep: 0.001,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveTotalPowerConsumption, Characteristic);

    EveRoomAirQuality = function () {
        Characteristic.call(this, 'Eve Air Quality', 'E863F10B-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "ppm",
            maxValue: 5000,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveRoomAirQuality, Characteristic);

    EveBatteryLevel = function () {
        Characteristic.call(this, 'Eve Battery Level', 'E863F11B-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "PERCENTAGE",
            maxValue: 100,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveBatteryLevel, Characteristic);

    EveAirPressure = function () {
        //todo: only rough guess of extreme values -> use correct min/max if known
        Characteristic.call(this, 'Eve AirPressure', 'E863F10F-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "hPa",
            maxValue: 1085,
            minValue: 870,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveAirPressure, Characteristic);

       ////////////////////////////// Custom services //////////////////////////////
    PowerMeterService = function (displayName, subtype) {
        Service.call(this, displayName, '00000001-0000-1777-8000-775D67EC4377', subtype);
        // Required Characteristics
        this.addCharacteristic(EvePowerConsumption);
        // Optional Characteristics
        this.addOptionalCharacteristic(EveTotalPowerConsumption);
    };
    inherits(PowerMeterService, Service);

    //Eve service (custom UUID)
    EveRoomService = function (displayName, subtype) {
        Service.call(this, displayName, 'E863F002-079E-48FF-8F27-9C2605A29F52', subtype);
        // Required Characteristics
        this.addCharacteristic(EveRoomAirQuality);
        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
    };
    inherits(EveRoomService, Service);

    /////////////////////////////////////////////////////////////////////////////////////////////
    //Eve service (custom UUID)
    EveWeatherService = function (displayName, subtype) {
        Service.call(this, displayName, 'E863F001-079E-48FF-8F27-9C2605A29F52', subtype);
        // Required Characteristics
        this.addCharacteristic(EveAirPressure);
        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
        this.addOptionalCharacteristic(Characteristic.CurrentTemperature);
        this.addOptionalCharacteristic(EveBatteryLevel);
    };
    inherits(EveWeatherService, Service);

    homebridge.registerAccessory("homebridge-domotiga", "Domotiga", Domotiga);
}


Domotiga.prototype = {
    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },
    domotigaGetValue: function (deviceValueNo, callback) {
        var that = this;
        JSONRequest('http://' + that.config.host + ':' + that.config.port,
                {
                    jsonrpc: "2.0",
                    method: "device.get",
                    params: { "device_id": that.config.device },
                    id: 1
                }, function (err, data) {
                    if (err) {
                        that.log("Sorry err: ", err);
                        callback(err);
                    }
                    else {
                        item = Number(deviceValueNo) - 1;
                        //that.log("data.result:", data.result);
                        //that.log( "data.result.values[item].value", data.result.values[item].value);
                        callback(null, data.result.values[item].value); 
                    }
                });
    },
    domotigaSetValue: function (deviceValueNo, value, callback) {
        var that = this;
        JSONRequest('http://' + that.config.host + ':' + that.config.port,
                {
                    jsonrpc: "2.0",
                    method: "device.set",
                    params: { "device_id": that.config.device, "valuenum": deviceValueNo, "value": value },
                    id: 1
                }, function (err, data) {
                    //that.log("data:", data);
                    if (err) {
                        that.log("Sorry err: ", err);
                        callback(err);
                    }
                    else {
                        callback();
                    }
                });
    },
    getCurrentRelativeHumidity: function (callback) {
        var that = this;
        that.log("getting CurrentRelativeHumidity for " + that.config.name);
        that.domotigaGetValue(that.config.valueHumidity, function (error, result) {
            if (error) {
                that.log('CurrentRelativeHumidity GetValue failed: %s', error.message);
                callback(error);
            } else {
                callback(null, Number(result));
            }
        }.bind(this));
    },
    getCurrentTemperature: function (callback) {
        var that = this;
        that.log("getting Temperature for " + that.config.name);
        that.domotigaGetValue(that.config.valueTemperature, function (error, result) {
            if (error) {
                that.log('CurrentTemperature GetValue failed: %s', error.message);
                callback(error);
            } else {
                callback(null, Number(result));
            }
        }.bind(this));
    },
    getTemperatureUnits: function (callback) {
        var that = this;
        that.log("getting Temperature unit for " + that.config.name);
        // 1 = F and 0 = C
        callback(null, 0);
    },
    getCurrentAirPressure: function (callback) {
        var that = this;
        that.log("getting CurrentAirPressure for " + that.config.name);
        that.domotigaGetValue(that.config.valueAirPressure, function (error, result) {
            if (error) {
                that.log('CurrentAirPressure GetValue failed: %s', error.message);
                callback(error);
            } else {
                callback(null, Number(result));
            }
        }.bind(this));
    },
    getContactState: function (callback) {
        var that = this;
        that.log("getting ContactState for " + that.config.name);
        that.domotigaGetValue(that.config.valueContact, function (error, result) {
            if (error) {
                that.log('getGetContactState GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on")
                    callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
                else
                    callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
            }
        }.bind(this));
    },
    getLeakSensorState: function (callback) {
        var that = this;
        that.log("getting LeakSensorState for " + that.config.name);
        that.domotigaGetValue(that.config.valueLeakSensor, function (error, result) {
            if (error) {
                that.log('getLeakSensorState GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (Number(result) == 0)
                    callback(null, Characteristic.LeakDetected.LEAK_NOT_DETECTED);
                else
                    callback(null, Characteristic.LeakDetected.LEAK_DETECTED);
            }
        }.bind(this));
    },
    getOutletState: function (callback) {
        var that = this;
        that.log("getting OutletState for " + that.config.name);
        that.domotigaGetValue(that.config.valueOutlet, function (error, result) {
            if (error) {
                that.log('getGetOutletState GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on")
                    callback(null, 0);
                else
                    callback(null, 1);
            }
        }.bind(this));
    },
    setOutletState: function (boolvalue, callback) {
        var that = this;
        that.log("Setting outlet state for '%s' to %s", that.config.name, boolvalue);

        if (boolvalue == 1)
            outletState = "On";
        else
            outletState = "Off";

        var callbackWasCalled = false;
        that.domotigaSetValue(that.config.valueOutlet, outletState, function (err) {
            if (callbackWasCalled)
                that.log("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");

            callbackWasCalled = true;
            if (!err) {
                that.log("Successfully set outlet state on the '%s' to %s", that.config.name, outletState);
                callback(null);
            }
            else {
                that.log("Error setting outlet state to %s on the '%s'", outletState, that.config.name);
                callback(err);
            }
        }.bind(this));
    },
    getOutletInUse: function (callback) {
        var that = this;
        that.log("getting OutletInUse for " + that.config.name);
        that.domotigaGetValue(that.config.valueOutlet, function (error, result) {
            if (error) {
                that.log('getOutletInUse GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on")
                    callback(null, false);
                else
                    callback(null, true);
            }
        }.bind(this));
    },
    getCurrentAirQuality: function (callback) {
        var that = this;
        that.log("getting airquality for " + that.config.name);

        that.domotigaGetValue(that.config.valueAirQuality, function (error, result) {
            if (error) {
                that.log('CurrentAirQuality GetValue failed: %s', error.message);
                callback(error);
            } else {
                voc = Number(result);
                that.log('CurrentAirQuality level: %s', voc);
                if (voc > 1500)
                    callback(null, Characteristic.AirQuality.POOR);
                else if (voc > 1000)
                    callback(null, Characteristic.AirQuality.INFERIOR);
                else if (voc > 800)
                    callback(null, Characteristic.AirQuality.FAIR);
                else if (voc > 600)
                    callback(null, Characteristic.AirQuality.GOOD);
                else if (voc > 0)
                    callback(null, Characteristic.AirQuality.EXCELLENT);
                else
                    callback(null, Characteristic.AirQuality.UNKNOWN);
            }
        }.bind(this));
    },
    // Eve characteristic (custom UUID)    
    getCurrentEveAirQuality: function (callback) {
        // Custom Eve intervals:
        //    0... 700 : Exzellent
        //  700...1100 : Good
        // 1100...1600 : Acceptable
        // 1600...2000 : Moderate
        //      > 2000 : Bad	
        var that = this;
        that.log("getting Eve room airquality for " + that.config.name);
        that.domotigaGetValue(that.config.valueAirQuality, function (error, result) {
            if (error) {
                that.log('CurrentEveAirQuality GetValue failed: %s', error.message);
                callback(error);
            } else {
                voc = Number(result);
                if (voc < 0)
                    voc = 0;
                callback(null, voc);
            }
        }.bind(this));
    },
    // Eve characteristic (custom UUID)    
    getEvePowerConsumption: function (callback) {
        var that = this;
        that.log("getting EvePowerConsumption for " + that.config.name);
        that.domotigaGetValue(that.config.valuePowerConsumption, function (error, result) {
            if (error) {
                that.log('PowerConsumption GetValue failed: %s', error.message);
                callback(error);
            } else {
                callback(null, Math.round(Number(result))); // W
            }
        }.bind(this));
    },
    // Eve characteristic (custom UUID)   
    getEveTotalPowerConsumption: function (callback) {
        var that = this;
        that.log("getting EveTotalPowerConsumption for " + that.config.name);
        that.domotigaGetValue(that.config.valueTotalPowerConsumption, function (error, result) {
            if (error) {
                that.log('EveTotalPowerConsumption GetValue failed: %s', error.message);
                callback(error);
            } else {
                callback(null, Math.round(Number(result) * 1000.0) / 1000.0); // kWh
            }
        }.bind(this));
    },
    getCurrentBatteryLevel: function (callback) {
        var that = this;
        that.log("getting Battery level for " + that.config.name);
        that.domotigaGetValue(that.config.valueBattery, function (error, result) {
            if (error) {
                that.log('CurrentBattery GetValue failed: %s', error.message);
                callback(error);
            } else {
                //that.log('CurrentBattery level Number(result): %s', Number(result));
                remaining = parseInt(Number(result) * 100 / 5000, 10);
                that.log('CurrentBattery level: %s', remaining);
                if (remaining > 100)
                    remaining = 100;
                else if (remaining < 0)
                    remaining = 0;
                callback(null, remaining);
            }
        }.bind(this));
    },
    getLowBatteryStatus: function (callback) {
        var that = this;
        that.log("getting BatteryStatus for " + that.config.name);
        that.domotigaGetValue(that.config.valueBattery, function (error, result) {
            if (error) {
                that.log('BatteryStatus GetValue failed: %s', error.message);
                callback(error);
            } else {
                var value = Number(result);
                if (isNaN(value) || value < Number(that.config.lowbattery))
                    callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                else
                    callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
            }
        }.bind(this));
    },
    getMotionDetected: function (callback) {
        var that = this;
        that.log("getting MotionDetected for " + that.config.name);
        that.domotigaGetValue(that.config.valueMotionSensor, function (error, result) {
            if (error) {
                that.log('getMotionDetected GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (Number(result) == 0)
                    callback(null, 0);
                else
                    callback(null, 1);
            }
        }.bind(this));
    },
    getSwitchState: function (callback) {
        var that = this;
        that.log("getting SwitchState for " + that.config.name);
        that.domotigaGetValue(that.config.valueSwitch, function (error, result) {
            if (error) {
                that.log('getSwitchState GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on")
                    callback(null, 1);
                else
                    callback(null, 0);
            }
        }.bind(this));
    },
    setSwitchState: function (switchOn, callback) {
        var that = this;
        that.log("Setting SwitchState for '%s' to %s", that.config.name, switchOn);

        if (switchOn == 1)
            switchState = "On";
        else
            switchState = "Off";

        var callbackWasCalled = false;
        that.domotigaSetValue(that.config.valueSwitch, switchState, function (err) {
            if (callbackWasCalled) {
                that.log("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
            }
            callbackWasCalled = true;
            if (!err) {
                that.log("Successfully set switch state on the '%s' to %s", that.config.name, switchOn);
                callback(null);
            }
            else {
                that.log("Error setting switch state to %s on the '%s'", switchOn, that.config.name);
                callback(err);
            }
        }.bind(this));
    },
    getServices: function () {
        // You can OPTIONALLY create an information service if you wish to override
        // the default values for things like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();
        informationService
                .setCharacteristic(Characteristic.Manufacturer, 'Domotiga: ' + (this.config.manufacturer ? this.config.manufacturer : '<unknown>'))
                .setCharacteristic(Characteristic.Model, 'Domotiga: ' + (this.config.model ? this.config.model : '<unknown>'))
                .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

        var services = [informationService];

        // Create primary service
        var primaryservice;
        switch (this.config.service) {

            case "TemperatureSensor":
                primaryservice = new Service.TemperatureSensor(this.config.service);
                primaryservice.getCharacteristic(Characteristic.CurrentTemperature)
                        .on('get', this.getCurrentTemperature.bind(this));
                break;

            case "HumiditySensor":
                primaryservice = new Service.HumiditySensor(this.config.service);
                primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity)
                        .on('get', this.getCurrentRelativeHumidity.bind(this));
                break;

            case "Contact":
                primaryservice = new Service.ContactSensor(this.config.service);
                primaryservice.getCharacteristic(Characteristic.ContactSensorState)
                        .on('get', this.getContactState.bind(this));
                break;

            case "LeakSensor":
                primaryservice = new Service.LeakSensor(this.config.service);
                primaryservice.getCharacteristic(Characteristic.LeakDetected)
                        .on('get', this.getLeakSensorState.bind(this));
                break;

            case "MotionSensor":
                primaryservice = new Service.MotionSensor(this.config.service);
                primaryservice.getCharacteristic(Characteristic.MotionDetected)
                        .on('get', this.getMotionDetected.bind(this));
                break;

            case "Switch":
                primaryservice = new Service.Switch(this.config.service);
                primaryservice.getCharacteristic(Characteristic.On)
                        .on('get', this.getSwitchState.bind(this))
                        .on('set', this.setSwitchState.bind(this));
                
                // Optional polling
                if (this.config.pollInMs){
                    this.log('Polling interval: %s ms', this.config.pollInMs);
                    setTimeout(this.getSwitchState.bind(this), Number(this.config.pollInMs) );
                }
                break;

            case "Outlet":
                primaryservice = new Service.Outlet(this.config.service);
                primaryservice.getCharacteristic(Characteristic.On)
                        .on('get', this.getOutletState.bind(this))
                        .on('set', this.setOutletState.bind(this));
                break;

            case "AirQualitySensor":
                primaryservice = new Service.AirQualitySensor(this.config.service);
                primaryservice.getCharacteristic(Characteristic.AirQuality)
                        .on('get', this.getCurrentAirQuality.bind(this));
                break;

            case "FakeEveAirQualitySensor":
                primaryservice = new EveRoomService("Eve Room");
                primaryservice.getCharacteristic(EveRoomAirQuality)
                        .on('get', this.getCurrentEveAirQuality.bind(this));
                break;

            case "FakeEveWeatherSensor":
                primaryservice = new EveWeatherService("Eve Weather");
                primaryservice.getCharacteristic(EveAirPressure)
                        .on('get', this.getCurrentAirPressure.bind(this));
                break;

            case "Powermeter":
                primaryservice = new PowerMeterService(this.config.service);
                primaryservice.getCharacteristic(EvePowerConsumption)
                        .on('get', this.getEvePowerConsumption.bind(this));
                break;

            default:
                this.log('Service %s %s unknown, skipping...', this.config.service, this.config.name);
                break;
        }
        services = services.concat(primaryservice);
        if (services.length === 1) {
            this.log("WARN: Only the InformationService was successfully configured for " + this.config.name + "! No device services available!");
            return services;
        }
        // Everything outside the primary service gets added as optional characteristics...
        var service = services[1];

        if (this.config.valueTemperature && (this.config.service != "TemperatureSensor")) {
            service.addCharacteristic(Characteristic.CurrentTemperature)
                    .on('get', this.getCurrentTemperature.bind(this));
        }
        if (this.config.valueHumidity && (this.config.service != "HumiditySensor")) {
            service.addCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on('get', this.getCurrentRelativeHumidity.bind(this));
        }
        if (this.config.valueBattery) {
            service.addCharacteristic(Characteristic.BatteryLevel)
                    .on('get', this.getCurrentBatteryLevel.bind(this));
        }
        if (this.config.lowbattery) {
            service.addCharacteristic(Characteristic.StatusLowBattery)
                    .on('get', this.getLowBatteryStatus.bind(this));
        }
        // Additional required characteristic for outlet
        if (this.config.service == "Outlet") {
            service.getCharacteristic(Characteristic.OutletInUse)
                    .on('get', this.getOutletInUse.bind(this));
        }
        // Eve characteristic (custom UUID)
        if (this.config.valueAirPressure &&  (this.config.service != "FakeEveWeatherSensor")) {
            service.addCharacteristic(EveAirPressure)
                    .on('get', this.getCurrentAirPressure.bind(this));
        }
        // Eve characteristic (custom UUID)
        if (this.config.valueAirQuality &&
            (this.config.service != "AirQualitySensor") && (this.config.service != "FakeEveAirQualitySensor")) {
            service.addCharacteristic(Characteristic.AirQuality)
                    .on('get', this.getCurrentEveAirQuality.bind(this));
        }
        // Eve characteristic (custom UUID)
        if (this.config.valuePowerConsumption && (this.config.service != "Powermeter")) {
            service.addCharacteristic(EvePowerConsumption)
                    .on('get', this.getEvePowerConsumption.bind(this));
        }
        // Eve characteristic (custom UUID)
        if (this.config.valueTotalPowerConsumption) {
            service.addCharacteristic(EveTotalPowerConsumption)
                    .on('get', this.getEveTotalPowerConsumption.bind(this));
        }
        return services;
    }
};
