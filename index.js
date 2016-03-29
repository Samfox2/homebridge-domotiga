var Service, Characteristic;
var JSONRequest = require("jsonrequest");
var inherits = require('util').inherits;

//Get data from config file 
function Domotiga(log, config) {
    this.log = log;
    this.config = {
        host: config.host || 'localhost',
        port: config.port || 9090,
        service: config.service,
        device: config.device,
        valueTemperature: config.valueTemperature,
        valueHumidity: config.valueHumidity,
	valueAirPressure: config.valueAirPressure,
        valueBattery: config.valueBattery,
        valueContact: config.valueContact,
        valueSwitch: config.valueSwitch,
        valueAirQuality: config.valueAirQuality,
        valueEveRoomAirQuality: config.valueEveRoomAirQuality,        
        valueOutlet: config.valueOutlet,
        valuePowerConsumption: config.valuePowerConsumption,
        valueTotalPowerConsumption: config.valueTotalPowerConsumption,
        name: config.name || NA,
        lowbattery: config.lowbattery
    };
}


module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    ////////////////////////////// Custom characteristics //////////////////////////////
    PowerConsumption = function() {
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
    inherits(PowerConsumption, Characteristic);

    TotalPowerConsumption = function() {
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
    inherits(TotalPowerConsumption, Characteristic);

    EveRoomAirQuality = function() {
      Characteristic.call(this, 'EVE Air Quality', 'E863F10B-079E-48FF-8F27-9C2605A29F52');
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

    EveBatteryLevel = function() {
      Characteristic.call(this, 'EVE Battery Level', 'E863F11B-079E-48FF-8F27-9C2605A29F52');
      this.setProps({
        format: Characteristic.Formats.UINT16,
        unit: "%",
        maxValue: 100,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(EveBatteryLevel, Characteristic);

    AirPressure = function() {
      Characteristic.call(this, 'AirPressure', 'E863F10F-079E-48FF-8F27-9C2605A29F52');
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
    inherits(AirPressure, Characteristic);

    ////////////////////////////// Custom services //////////////////////////////
    PowerMeterService = function(displayName, subtype) {
    Service.call(this, displayName, '00000001-0000-1777-8000-775D67EC4377', subtype);

    // Required Characteristics
    this.addCharacteristic(PowerConsumption);

    // Optional Characteristics
    this.addOptionalCharacteristic(TotalPowerConsumption);
    };
    inherits(PowerMeterService, Service);

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
                        //that.log( "data.result[values][0][value]", data.result[values][0][value]);
                        i = 0;
                        for (key1 in data.result) {
                            if (i == 37) {
                                //that.log("key1 ", i, key1, "values[key1]", values[key1]);
                                j = 0;
                                for (key2 in data.result[key1]) {
                                    if (j == item) {
                                        //that.log("key2 ", j, key2, "values[key1][key2]", values[key1][key2]);
                                        k = 0;
                                        for (key3 in data.result[key1][key2]) {
                                            if (k == 17) {
                                                //that.log("key3 ", k, key3, "data.result[key1][key2][key3]", data.result[key1][key2][key3]);
                                                callback(null, data.result[key1][key2][key3]);
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
                if (result.toLowerCase() == "on") {
                    callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED );
                }
                else {
                    callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED );
                }
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
                if (result.toLowerCase() == "on") {
                    callback(null, 0);
                }
                else {
                    callback(null, 1);
                }
            }
        }.bind(this));
    },
    setOutletState: function (boolvalue, callback) {
        var that = this;
        that.log("Setting outlet state for '%s' to %s", that.config.name, boolvalue);

        if (boolvalue == 1) {
            outletState = "On";
        }
        else {
            outletState = "Off";
        }
        var callbackWasCalled = false;
        that.domotigaSetValue(that.config.valueOutlet, outletState, function (err) {
            if (callbackWasCalled) {
                that.log("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
            }
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
                if (result.toLowerCase() == "on") {
                    callback(null, false);
                }
		else {
                    callback(null, true);
                }
            }
        }.bind(this));
    },

    getPowerConsumption: function (callback) {
        var that = this;
        that.log("getting PowerConsumption for " + that.config.name);
        that.domotigaGetValue(that.config.valuePowerConsumption, function (error, result) {
            if (error) {
                that.log('PowerConsumption GetValue failed: %s', error.message);
                callback(error);
            } else {
		// Supposedly units are 0.1W, but by experience it's simply Watts ...?
                callback(null, Math.round(Number(result)));
            }
        }.bind(this));
    },
    
    getTotalPowerConsumption: function (callback) {
        var that = this;
        that.log("getting TotalPowerConsumption for " + that.config.name);
        that.domotigaGetValue(that.config.valueTotalPowerConsumption, function (error, result) {
            if (error) {
                that.log('TotalPowerConsumption GetValue failed: %s', error.message);
                callback(error);
            } else {
                // Supposedly units are 0.001kWh, but by experience it's simply kWh ...?
                callback(null, Math.round(Number(result)*1000.0)/1000.0);
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
                airquality = Number(result);
                that.log('CurrentAirQuality level: %s', airquality);
                if(airquality > 1500)
                    callback(null, Characteristic.AirQuality.POOR);
                else if(airquality > 1000)
                    callback(null, Characteristic.AirQuality.INFERIOR);
                else if(airquality > 800)
                    callback(null, Characteristic.AirQuality.FAIR);
                else if(airquality > 600)
                    callback(null, Characteristic.AirQuality.GOOD);
                else if(airquality > 0)
                    callback(null, Characteristic.AirQuality.EXCELLENT);
                else
                    callback(null, Characteristic.AirQuality.UNKNOWN);               
            }
        }.bind(this));
    },  
    getCurrentEveRoomAirQuality: function (callback) {
        var that = this;
        that.log("getting EVE room airquality for " + that.config.name);

        that.domotigaGetValue(that.config.valueAirQuality, function (error, result) {
            if (error) {
                that.log('CurrentEveRoomAirQuality GetValue failed: %s', error.message);
                callback(error);
            } else {
                voc = Number(result);
                if (voc < 0)
                    voc = 0;
               callback(null, voc);        
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
                if (Number(result) < Number(that.config.lowbattery)) {
                    callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                }
                else {
                    callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                }
            }
        }.bind(this));
    },
    getSwitchOn: function (callback) {
        var that = this;
        that.log("getting SwitchState for " + that.config.name);
        that.domotigaGetValue(that.config.valueSwitch, function (error, result) {
            if (error) {
                that.log('getSwitchOn GetValue failed: %s', error.message);
                callback(error);
            } else {
                if (result.toLowerCase() == "on") {
                    callback(null, 1);
                }
                else {
                    callback(null, 0);
                }
            }
        }.bind(this));
    },
    setSwitchOn: function (switchOn, callback) {
        var that = this;
        that.log("Setting SwitchState for '%s' to %s", that.config.name, switchOn);

        if (switchOn == 1) {
            switchState = "On";
        }
        else {
            switchState = "Off";
        }
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
            //optionals
            if (this.config.valueHumidity) {
                controlService
                        .addCharacteristic(Characteristic.CurrentRelativeHumidity)
                        .on('get', this.getCurrentRelativeHumidity.bind(this));
            }
	    //custom EVE characteristic
            if (this.config.valueAirPressure) {
                controlService
                        .addCharacteristic(AirPressure)
                        .on('get', this.getCurrentAirPressure.bind(this));
            }
	    
            if (this.config.valueBattery) {
                controlService
                        .addCharacteristic(Characteristic.BatteryLevel)
                        .on('get', this.getCurrentBatteryLevel.bind(this));
            }
            if (this.config.lowbattery) {
                controlService
                        .addCharacteristic(Characteristic.StatusLowBattery)
                        .on('get', this.getLowBatteryStatus.bind(this));
            }
            return [informationService, controlService];
        }
        else if (this.config.service == "Contact") {

            informationService
                    .setCharacteristic(Characteristic.Manufacturer, "Contact Manufacturer")
                    .setCharacteristic(Characteristic.Model, "Contact Model")
                    .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

            var controlService = new Service.ContactSensor();

            controlService
                    .getCharacteristic(Characteristic.ContactSensorState)
                    .on('get', this.getContactState.bind(this));

            //optionals
            if (this.config.valueBattery) {
                controlService
                        .addCharacteristic(Characteristic.BatteryLevel)
                        .on('get', this.getCurrentBatteryLevel.bind(this));
            }
            if (this.config.lowbattery) {
                controlService
                        .addCharacteristic(Characteristic.StatusLowBattery)
                        .on('get', this.getLowBatteryStatus.bind(this));
            }
            return [informationService, controlService];
        }
        else if (this.config.service == "Switch") {

            informationService
                    .setCharacteristic(Characteristic.Manufacturer, "Switch Manufacturer")
                    .setCharacteristic(Characteristic.Model, "Switch Model")
                    .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

            var controlService = new Service.Switch(this.config.name);

            controlService
                    .getCharacteristic(Characteristic.On)
                    .on('get', this.getSwitchOn.bind(this))
                    .on('set', this.setSwitchOn.bind(this));

            return [informationService, controlService];
        }
        else if (this.config.service == "Outlet") {

            informationService
                    .setCharacteristic(Characteristic.Manufacturer, "Outlet Manufacturer")
                    .setCharacteristic(Characteristic.Model, "Outlet Model")
                    .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

            var controlService = new Service.Outlet();

            controlService
                    .getCharacteristic(Characteristic.On)
                    .on('get', this.getOutletState.bind(this))
                    .on('set', this.setOutletState.bind(this));

            controlService
                    .getCharacteristic(Characteristic.OutletInUse)
                    .on('get', this.getOutletInUse.bind(this));


            //optionals
            if (this.config.valuePowerConsumption) {
                controlService
                        .addCharacteristic(PowerConsumption)
                        .on('get', this.getPowerConsumption.bind(this));

            }
            if (this.config.valueTotalPowerConsumption) {
                controlService
                        .addCharacteristic(TotalPowerConsumption)
                        .on('get', this.getTotalPowerConsumption.bind(this));
            }
  
            return [informationService, controlService];
        }
        if (this.config.service == "AirQualitySensor") {
            informationService
                    .setCharacteristic(Characteristic.Manufacturer, "AirQualitySensor Manufacturer")
                    .setCharacteristic(Characteristic.Model, "AirQualitySensor Sensor")
                    .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

            var controlService = new Service.AirQualitySensor();

            controlService
                    .getCharacteristic(Characteristic.AirQuality)
                    .on('get', this.getCurrentAirQuality.bind(this));
            //optionals
            if (this.config.valueBattery) {
                controlService
                        .addCharacteristic(Characteristic.BatteryLevel)
                        .on('get', this.getCurrentBatteryLevel.bind(this));
            }
            if (this.config.lowbattery) {
                controlService
                        .addCharacteristic(Characteristic.StatusLowBattery)
                        .on('get', this.getLowBatteryStatus.bind(this));
            }
            return [informationService, controlService];
        } 
        if (this.config.service == "EVEAirQualitySensor") {
            informationService
                    .setCharacteristic(Characteristic.Manufacturer, "EVE AirQualitySensor Manufacturer")
                    .setCharacteristic(Characteristic.Model, "EVE Room airquality sensor")
                    .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

            var controlService = new Service.AirQualitySensor();

            controlService
                    .getCharacteristic(EveRoomAirQuality)
                    .on('get', this.getCurrentEveRoomAirQuality.bind(this));
            //optionals (EVE battery)
            if (this.config.valueBattery) {
                controlService
                        .addCharacteristic(EveBatteryLevel)
                        .on('get', this.getCurrentBatteryLevel.bind(this));
            }
            return [informationService, controlService];
        }         
        else if (this.config.service == "Powermeter") {

            informationService
                    .setCharacteristic(Characteristic.Manufacturer, "Powermeter Manufacturer")
                    .setCharacteristic(Characteristic.Model, "Powermeter Model")
                    .setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + this.config.device + this.config.name));

            var controlService = new PowerMeterService("Powermeter");

           controlService
                        .getCharacteristic(PowerConsumption)
                        .on('get', this.getPowerConsumption.bind(this));

            //optionals
            if (this.config.valueTotalPowerConsumption) {
            controlService
                    .getCharacteristic(TotalPowerConsumption)
                    .on('get', this.getTotalPowerConsumption.bind(this));
            }
            return [informationService, controlService];
        }
    }
};

