//"use strict";
var Accessory, Service, Characteristic, UUIDGen;
var JSONRequest = require("jsonrequest");
var inherits = require('util').inherits;
var pollingtoevent = require('polling-to-event');

module.exports = function (homebridge) {

    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

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

    homebridge.registerPlatform("homebridge-domotiga", "DomotiGa", DomotigaPlatform);
}

function DomotigaPlatform(log, config, api) {
    this.log = log;
    this.config = config;

    // Global configuration
    this.host = config.host || 'localhost';
    this.port = config.port || 9090;

    // Device specific configuration
    this.devices = this.config.devices || [];
    this.accessories = [];

    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}

DomotigaPlatform.prototype.configureAccessory = function (accessory) {
    var accessoryId = accessory.context.name;

    this.setService(accessory);
    this.accessories[accessoryId] = accessory;
}


DomotigaPlatform.prototype.setService = function (accessory) {

    // Create primary service
    switch (accessory.context.service) {

        case "TemperatureSensor":
            this.primaryservice = accessory.getService(Service.TemperatureSensor);
            this.primaryservice.getCharacteristic(Characteristic.CurrentTemperature)
                .on('get', this.getCurrentTemperature.bind(this, accessory.context));
            break;

        case "HumiditySensor":
            this.primaryservice = accessory.getService(Service.HumiditySensor);
            this.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', this.getCurrentRelativeHumidity.bind(this, accessory.context));
            break;

        case "Contact":
            this.primaryservice = accessory.getService(Service.ContactSensor);
            this.primaryservice.getCharacteristic(Characteristic.ContactSensorState)
                .on('get', this.getContactState.bind(this, accessory.context));
            this.primaryValue = this.config.valueContact;
            break;

        case "LeakSensor":
            this.primaryservice = accessory.getService(Service.LeakSensor);
            this.primaryservice.getCharacteristic(Characteristic.LeakDetected)
                .on('get', this.getLeakSensorState.bind(this, accessory.context));
            this.primaryValue = this.config.valueLeakSensor;
            break;

        case "MotionSensor":
            this.primaryservice = accessory.getService(Service.MotionSensor);
            this.primaryservice.getCharacteristic(Characteristic.MotionDetected)
                .on('get', this.getMotionDetected.bind(this, accessory.context));
            this.primaryValue = this.config.valueMotionSensor;
            break;

        case "Switch":
            this.primaryservice = accessory.getService(Service.Switch);
            this.primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.getSwitchState.bind(this, accessory.context))
                .on('set', this.setSwitchState.bind(this, accessory.context));
            this.primaryValue = this.config.valueSwitch;
            break;

        case "Outlet":
            this.primaryservice = accessory.getService(Service.Outlet);
            this.primaryservice.getCharacteristic(Characteristic.On)
                .on('get', this.getOutletState.bind(this, accessory.context))
                .on('set', this.setOutletState.bind(this, accessory.context));
            this.primaryValue = this.config.valueOutlet;
            break;

        case "AirQualitySensor":
            this.primaryservice = accessory.getService(Service.AirQualitySensor);
            this.primaryservice.getCharacteristic(Characteristic.AirQuality)
                .on('get', this.getCurrentAirQuality.bind(this, accessory.context));
            break;

        case "FakeEveAirQualitySensor":
            this.primaryservice = accessory.getService(Service.EveRoomService);
            this.primaryservice.getCharacteristic(EveRoomAirQuality)
                .on('get', this.getCurrentEveAirQuality.bind(this, accessory.context));
            break;

        case "FakeEveWeatherSensor":
            this.primaryservice = accessory.getService(Service.EveWeatherService);
            this.primaryservice.getCharacteristic(EveAirPressure)
                .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
            break;

        case "FakeEveWeatherSensorWithLog":
            this.primaryservice = accessory.getService(Service.EveWeatherService);
            this.primaryservice.getCharacteristic(EveAirPressure)
                .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
            break;

        case "Powermeter":
            this.primaryservice = accessory.getService(Service.PowerMeterService);
            this.primaryservice.getCharacteristic(EvePowerConsumption)
                .on('get', this.getEvePowerConsumption.bind(this, accessory.context));
            break;
            // for testing purposes only:
        case "Doorbell":
            this.primaryservice = accessory.getService(Service.Doorbell);
            this.primaryservice.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                .on('set', this.triggerProgrammableSwitchEvent.bind(this, accessory.context));
            break;

        default:
            this.log.error('Service %s %s unknown, skipping...', accessory.context.service, accessory.context.name);
            break;
    }


    // Everything outside the primary service gets added as optional characteristics...
    if (accessory.context.valueTemperature && (accessory.context.service != "TemperatureSensor")) {
        this.primaryservice.getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this, accessory.context));
    }
    if (accessory.context.valueHumidity && (accessory.context.service != "HumiditySensor")) {
        this.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.getCurrentRelativeHumidity.bind(this, accessory.context));
    }
    if (accessory.context.valueBattery) {
        this.primaryservice.getCharacteristic(Characteristic.BatteryLevel)
            .on('get', this.getCurrentBatteryLevel.bind(this, accessory.context));
    }
    if (accessory.context.lowbattery) {
        this.primaryservice.getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', this.getLowBatteryStatus.bind(this, accessory.context));
    }
    // Additional required characteristic for outlet
    if (accessory.context.service == "Outlet") {
        this.primaryservice.getCharacteristic(Characteristic.OutletInUse)
            .on('get', this.getOutletInUse.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirPressure &&
        (accessory.context.service != "FakeEveWeatherSensor") && (accessory.context.service != "FakeEveWeatherSensorWithLog")) {
        this.primaryservice.getCharacteristic(EveAirPressure)
            .on('get', this.getCurrentAirPressure.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueAirQuality &&
        (accessory.context.service != "AirQualitySensor") && (accessory.context.service != "FakeEveAirQualitySensor")) {
        this.primaryservice.getCharacteristic(Characteristic.AirQuality)
            .on('get', this.getCurrentEveAirQuality.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valuePowerConsumption && (accessory.context.service != "Powermeter")) {
        this.primaryservice.getCharacteristic(EvePowerConsumption)
            .on('get', this.getEvePowerConsumption.bind(this, accessory.context));
    }
    // Eve characteristic (custom UUID)
    if (accessory.context.valueTotalPowerConsumption) {
        this.primaryservice.getCharacteristic(EveTotalPowerConsumption)
            .on('get', this.getEveTotalPowerConsumption.bind(this, accessory.context));
    }

    accessory.on('identify', this.identify.bind(this, accessory.context));
}



DomotigaPlatform.prototype.didFinishLaunching = function () {

    if (!this.devices.length) {
        this.log.error("No devices configured. Please check your 'config.json' file!");
    }

    for (var i in this.devices) {
        var data = this.devices[i];
        this.log("Adding device: " + data.name);
        this.addAccessory(data);
    }

    for (var id in this.accessories) {
        var device = this.accessories[id];
        if (!device.reachable) {
            this.removeAccessory(device);
        }
    }
}

// Get data from config file and configure accessory
DomotigaPlatform.prototype.addAccessory = function (data) {
    if (!this.accessories[data.name]) {

        var uuid = UUIDGen.generate(data.name);
        var newAccessory = new Accessory(data.name, uuid, 8);

        newAccessory.reachable = true;
        newAccessory.context.name = data.name || NA;
        newAccessory.context.service = data.service;
        newAccessory.context.device = data.device;
        newAccessory.context.manufacturer = data.manufacturer;
        newAccessory.context.model = data.model;
        newAccessory.context.valueTemperature = data.valueTemperature;
        newAccessory.context.valueHumidity = data.valueHumidity;
        newAccessory.context.valueAirPressure = data.valueAirPressure;
        newAccessory.context.valueBattery = data.valueBattery;
        newAccessory.context.lowbattery = data.lowbattery;
        newAccessory.context.valueContact = data.valueContact;
        newAccessory.context.valueSwitch = data.valueSwitch;
        newAccessory.context.valueAirQuality = data.valueAirQuality;
        newAccessory.context.valueOutlet = data.valueOutlet;
        newAccessory.context.valueLeakSensor = data.valueLeakSensor;
        newAccessory.context.valueMotionSensor = data.valueMotionSensor;
        newAccessory.context.valuePowerConsumption = data.valuePowerConsumption;
        newAccessory.context.valueTotalPowerConsumption = data.valueTotalPowerConsumption;
        newAccessory.context.valueDoorbell = data.valueDoorbell;
        newAccessory.context.pollInMs = data.pollInMs;

        // Create primary service
        switch (newAccessory.context.service) {

            case "TemperatureSensor":
                this.primaryservice = new Service.TemperatureSensor(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.CurrentTemperature)
                    .on('get', this.getCurrentTemperature.bind(this, newAccessory.context));
                break;

            case "HumiditySensor":
                this.primaryservice = new Service.HumiditySensor(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on('get', this.getCurrentRelativeHumidity.bind(this, newAccessory.context));
                break;

            case "Contact":
                this.primaryservice = new Service.ContactSensor(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.ContactSensorState)
                    .on('get', this.getContactState.bind(this, newAccessory.context));
                this.primaryValue = this.config.valueContact;
                break;

            case "LeakSensor":
                this.primaryservice = new Service.LeakSensor(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.LeakDetected)
                    .on('get', this.getLeakSensorState.bind(this, newAccessory.context));
                this.primaryValue = this.config.valueLeakSensor;
                break;

            case "MotionSensor":
                this.primaryservice = new Service.MotionSensor(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.MotionDetected)
                    .on('get', this.getMotionDetected.bind(this, newAccessory.context));
                this.primaryValue = this.config.valueMotionSensor;
                break;

            case "Switch":
                this.primaryservice = new Service.Switch(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.On)
                    .on('get', this.getSwitchState.bind(this, newAccessory.context))
                    .on('set', this.setSwitchState.bind(this, newAccessory.context));
                this.primaryValue = this.config.valueSwitch;
                break;

            case "Outlet":
                this.primaryservice = new Service.Outlet(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.On)
                    .on('get', this.getOutletState.bind(this, newAccessory.context))
                    .on('set', this.setOutletState.bind(this, newAccessory.context));
                this.primaryValue = this.config.valueOutlet;
                break;

            case "AirQualitySensor":
                this.primaryservice = new Service.AirQualitySensor(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.AirQuality)
                    .on('get', this.getCurrentAirQuality.bind(this, newAccessory.context));
                break;

            case "FakeEveAirQualitySensor":
                this.primaryservice = new EveRoomService("Eve Room");
                this.primaryservice.getCharacteristic(EveRoomAirQuality)
                    .on('get', this.getCurrentEveAirQuality.bind(this, newAccessory.context));
                break;

            case "FakeEveWeatherSensor":
                this.primaryservice = new EveWeatherService("Eve Weather");
                this.primaryservice.getCharacteristic(EveAirPressure)
                    .on('get', this.getCurrentAirPressure.bind(this, newAccessory.context));
                break;

            case "FakeEveWeatherSensorWithLog":
                this.primaryservice = new EveWeatherService("Eve Weather");
                this.primaryservice.getCharacteristic(EveAirPressure)
                    .on('get', this.getCurrentAirPressure.bind(this, newAccessory.context));
                break;

            case "Powermeter":
                this.primaryservice = new PowerMeterService(newAccessory.context.service);
                this.primaryservice.getCharacteristic(EvePowerConsumption)
                    .on('get', this.getEvePowerConsumption.bind(this, newAccessory.context));
                break;
                // for testing purposes only:
            case "Doorbell":
                this.primaryservice = new Service.Doorbell(newAccessory.context.service);
                this.primaryservice.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                    .on('set', this.triggerProgrammableSwitchEvent.bind(this, newAccessory.context));
                break;

            default:
                this.log.error('Service %s %s unknown, skipping...', newAccessory.context.service, newAccessory.context.name);
                break;
        }



        // Everything outside the primary service gets added as optional characteristics...
        if (newAccessory.context.valueTemperature && (newAccessory.context.service != "TemperatureSensor")) {
            this.primaryservice.addCharacteristic(Characteristic.CurrentTemperature)
                .on('get', this.getCurrentTemperature.bind(this, newAccessory.context));
        }
        if (newAccessory.context.valueHumidity && (newAccessory.context.service != "HumiditySensor")) {
            this.primaryservice.addCharacteristic(Characteristic.CurrentRelativeHumidity)
                .on('get', this.getCurrentRelativeHumidity.bind(this, newAccessory.context));
        }
        if (newAccessory.context.valueBattery) {
            this.primaryservice.addCharacteristic(Characteristic.BatteryLevel)
                .on('get', this.getCurrentBatteryLevel.bind(this, newAccessory.context));
        }
        if (newAccessory.context.lowbattery) {
            this.primaryservice.addCharacteristic(Characteristic.StatusLowBattery)
                .on('get', this.getLowBatteryStatus.bind(this, newAccessory.context));
        }
        // Additional required characteristic for outlet
        if (newAccessory.context.service == "Outlet") {
            this.primaryservice.getCharacteristic(Characteristic.OutletInUse)
                .on('get', this.getOutletInUse.bind(this, newAccessory.context));
        }
        // Eve characteristic (custom UUID)
        if (newAccessory.context.valueAirPressure &&
            (newAccessory.context.service != "FakeEveWeatherSensor") && (newAccessory.context.service != "FakeEveWeatherSensorWithLog")) {
            this.primaryservice.addCharacteristic(EveAirPressure)
                .on('get', this.getCurrentAirPressure.bind(this, newAccessory.context));
        }
        // Eve characteristic (custom UUID)
        if (newAccessory.context.valueAirQuality &&
            (newAccessory.context.service != "AirQualitySensor") && (newAccessory.context.service != "FakeEveAirQualitySensor")) {
            this.primaryservice.addCharacteristic(Characteristic.AirQuality)
                .on('get', this.getCurrentEveAirQuality.bind(this, newAccessory.context));
        }
        // Eve characteristic (custom UUID)
        if (newAccessory.context.valuePowerConsumption && (newAccessory.context.service != "Powermeter")) {
            this.primaryservice.addCharacteristic(EvePowerConsumption)
                .on('get', this.getEvePowerConsumption.bind(this, newAccessory.context));
        }
        // Eve characteristic (custom UUID)
        if (newAccessory.context.valueTotalPowerConsumption) {
            this.primaryservice.addCharacteristic(EveTotalPowerConsumption)
                .on('get', this.getEveTotalPowerConsumption.bind(this, newAccessory.context));
        }

        newAccessory.addService(this.primaryservice, data.name);
        newAccessory.on('identify', this.identify.bind(this, newAccessory.context));

        this.api.registerPlatformAccessories("homebridge-domotiga", "DomotiGa", [newAccessory]);
    }
    else {
        var newAccessory = this.accessories[data.name];
        newAccessory.updateReachability(true);
    }

    this.getInitState(newAccessory, data);

    this.accessories[data.name] = newAccessory;
}

DomotigaPlatform.prototype.removeAccessory = function (accessory) {
    if (accessory) {
        var name = accessory.context.name;
        this.log.warn("Removing Domotigadevice: " + name + ". No longer reachable or configured.");
        this.api.unregisterPlatformAccessories("homebridge-domotiga", "DomotiGa", [accessory]);
        delete this.accessories[name];
    }
}

DomotigaPlatform.prototype.getInitState = function (accessory, data) {
    var info = accessory.getService(Service.AccessoryInformation);

    info.setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer);

    info.setCharacteristic(Characteristic.Model, accessory.context.model);

    info.setCharacteristic(Characteristic.SerialNumber, ("Domotiga device " + accessory.context.device + accessory.context.name));

    //accessory.getService(Service.Switch)
    //    .getCharacteristic(Characteristic.On)
    //    .getValue();
}

DomotigaPlatform.prototype.getCurrentTemperature = function (thisdevice, callback) {

    this.log("getting Temperature for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueTemperature, function (error, result) {
        if (error) {
            this.log.error('CurrentTemperature GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(error, Number(result));
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentRelativeHumidity = function (thisdevice, callback) {

    this.log("getting CurrentRelativeHumidity for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueHumidity, function (error, result) {
        if (error) {
            this.log.error('CurrentRelativeHumidity GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(error, Number(result));
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getTemperatureUnits = function (thisdevice, callback) {
    this.log("getting Temperature unit for " + thisdevice.name);
    // 1 = F and 0 = C
    callback(null, 0);
}

DomotigaPlatform.prototype.getCurrentAirPressure = function (thisdevice, callback) {
    this.log("getting CurrentAirPressure for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirPressure, function (error, result) {
        if (error) {
            this.log.error('CurrentAirPressure GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(null, Number(result));
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getContactState = function (thisdevice, callback) {
    this.log("getting ContactState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueContact, function (error, result) {
        if (error) {
            this.log.error('getGetContactState GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
            else
                callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getLeakSensorState = function (thisdevice, callback) {
    this.log("getting LeakSensorState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueLeakSensor, function (error, result) {
        if (error) {
            this.log.error('getLeakSensorState GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (Number(result) == 0)
                callback(null, Characteristic.LeakDetected.LEAK_NOT_DETECTED);
            else
                callback(null, Characteristic.LeakDetected.LEAK_DETECTED);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getOutletState = function (thisdevice, callback) {
    this.log("getting OutletState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueOutlet, function (error, result) {
        if (error) {
            this.log.error('getGetOutletState GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, 0);
            else
                callback(null, 1);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.setOutletState = function (thisdevice, boolvalue, callback) {
    this.log("Setting outlet state for '%s' to %s", thisdevice.name, boolvalue);

    if (boolvalue == 1)
        outletState = "On";
    else
        outletState = "Off";

    var callbackWasCalled = false;
    this.domotigaSetValue(thisdevice.device, thisdevice.valueOutlet, outletState, function (err) {
        if (callbackWasCalled)
            this.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");

        callbackWasCalled = true;
        if (!err) {
            this.log("Successfully set outlet state on the '%s' to %s", thisdevice.name, outletState);
            callback(null);
        } else {
            this.log.error("Error setting outlet state to %s on the '%s'", outletState, thisdevice.name);
            callback(err);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getOutletInUse = function (thisdevice, callback) {
    this.log("getting OutletInUse for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueOutlet, function (error, result) {
        if (error) {
            this.log.error('getOutletInUse GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, false);
            else
                callback(null, true);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentAirQuality = function (thisdevice, callback) {
    this.log("getting airquality for " + thisdevice.name);

    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirQuality, function (error, result) {
        if (error) {
            this.log.error('CurrentAirQuality GetValue failed: %s', error.message);
            callback(error);
        } else {
            voc = Number(result);
            this.log('CurrentAirQuality level: %s', voc);
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
}

// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.getCurrentEveAirQuality = function (thisdevice, callback) {
    // Custom Eve intervals:
    //    0... 700 : Exzellent
    //  700...1100 : Good
    // 1100...1600 : Acceptable
    // 1600...2000 : Moderate
    //      > 2000 : Bad	
    this.log("getting Eve room airquality for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueAirQuality, function (error, result) {
        if (error) {
            this.log.error('CurrentEveAirQuality GetValue failed: %s', error.message);
            callback(error);
        } else {
            voc = Number(result);
            if (voc < 0)
                voc = 0;
            callback(null, voc);
        }
    }.bind(this));
}

// Eve characteristic (custom UUID)    
DomotigaPlatform.prototype.getEvePowerConsumption = function (thisdevice, callback) {
    this.log("getting EvePowerConsumption for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valuePowerConsumption, function (error, result) {
        if (error) {
            this.log.error('PowerConsumption GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(null, Math.round(Number(result))); // W
        }
    }.bind(this));
}

// Eve characteristic (custom UUID)   
DomotigaPlatform.prototype.getEveTotalPowerConsumption = function (thisdevice, callback) {
    this.log("getting EveTotalPowerConsumption for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueTotalPowerConsumption, function (error, result) {
        if (error) {
            this.log.error('EveTotalPowerConsumption GetValue failed: %s', error.message);
            callback(error);
        } else {
            callback(null, Math.round(Number(result) * 1000.0) / 1000.0); // kWh
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getCurrentBatteryLevel = function (thisdevice, callback) {
    this.log("getting Battery level for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueBattery, function (error, result) {
        if (error) {
            this.log.error('CurrentBattery GetValue failed: %s', error.message);
            callback(error);
        } else {
            //this.log('CurrentBattery level Number(result): %s', Number(result));
            remaining = parseInt(Number(result) * 100 / 5000, 10);
            this.log('CurrentBattery level: %s', remaining);
            if (remaining > 100)
                remaining = 100;
            else if (remaining < 0)
                remaining = 0;
            callback(null, remaining);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getLowBatteryStatus = function (thisdevice, callback) {
    this.log("getting BatteryStatus for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueBattery, function (error, result) {
        if (error) {
            this.log.error('BatteryStatus GetValue failed: %s', error.message);
            callback(error);
        } else {
            var value = Number(result);
            if (isNaN(value) || value < Number(thisdevice.lowbattery))
                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
            else
                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getMotionDetected = function (thisdevice, callback) {
    this.log("getting MotionDetected for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueMotionSensor, function (error, result) {
        if (error) {
            this.log.error('getMotionDetected GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (Number(result) == 0)
                callback(null, 0);
            else
                callback(null, 1);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.getSwitchState = function (thisdevice, callback) {
    this.log("getting SwitchState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueSwitch, function (error, result) {
        if (error) {
            this.log.error('getSwitchState GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, 1);
            else
                callback(null, 0);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.setSwitchState = function (thisdevice, switchOn, callback) {
    this.log("Setting SwitchState for '%s' to %s", thisdevice.name, switchOn);

    if (switchOn == 1)
        switchState = "On";
    else
        switchState = "Off";

    var callbackWasCalled = false;
    this.domotigaSetValue(thisdevice.device, thisdevice.valueSwitch, switchState, function (err) {
        if (callbackWasCalled) {
            this.log.warn("WARNING: domotigaSetValue called its callback more than once! Discarding the second one.");
        }
        callbackWasCalled = true;
        if (!err) {
            this.log("Successfully set switch state on the '%s' to %s", thisdevice.name, switchOn);
            callback(null);
        } else {
            this.log.error("Error setting switch state to %s on the '%s'", switchOn, thisdevice.name);
            callback(err);
        }
    }.bind(this));
}

DomotigaPlatform.prototype.triggerProgrammableSwitchEventsave = function (thisdevice, callback) {
    this.log("getting DoorbellState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueDoorbell, function (error, result) {
        if (error) {
            this.log.error('getDoorbellOn GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on")
                callback(null, 1);
            else
                callback(null, 0);
        }
    }.bind(this));
}

// for testing purposes only:
DomotigaPlatform.prototype.triggerProgrammableSwitchEvent = function (thisdevice, callback) {
    this.log("getting DoorbellState for " + thisdevice.name);
    this.domotigaGetValue(thisdevice.device, thisdevice.valueDoorbell, function (error, result) {
        if (error) {
            this.log.error('triggerProgrammableSwitchEvent GetValue failed: %s', error.message);
            callback(error);
        } else {
            if (result.toLowerCase() == "on") {
                this.getService(Service.Doorbell.setCharacteristic(Characteristic.ProgrammableSwitchEvent, 1));
                this.log("Ding");

                setTimeout(function () {
                    this.getService(Service.Doorbell.setCharacteristic(Characteristic.ProgrammableSwitchEvent, 0));
                    this.log("Dong");
                }, 10000);
            } else {
                callback(null, 0);
            }
        }
    }.bind(this));
}

DomotigaPlatform.prototype.identify = function (thisdevice, paired, callback) {
    this.log("Identify requested for " + thisdevice.name);
    callback();
}

// Set value at domotiga database
DomotigaPlatform.prototype.domotigaSetValue = function (device, deviceValueNo, value, callback) {

    JSONRequest('http://' + this.host + ':' + this.port, {
        jsonrpc: "2.0",
        method: "device.set",
        params: {
            "device_id": device,
            "valuenum": deviceValueNo,
            "value": value
        },
        id: 1
    }, function (err, data) {
        //this.log("data:", data);
        if (err) {
            this.log.error("Sorry err: ", err);
            callback(err);
        } else {
            callback();
        }
    });
}

// Get value from domotiga database
DomotigaPlatform.prototype.domotigaGetValue = function (device, deviceValueNo, callback) {

    JSONRequest('http://' + this.host + ':' + this.port, {
        jsonrpc: "2.0",
        method: "device.get",
        params: {
            "device_id": device
        },
        id: 1
    }, function (err, data) {
        if (err) {
            this.log.error("Sorry err: ", err);
            callback(err);
        } else {
            item = Number(deviceValueNo) - 1;
            //this.log("data.result:", data.result);
            //this.log( "data.result.values[item].value", data.result.values[item].value);
            callback(null, data.result.values[item].value);
        }
    });
}

//DomotigaPlatform.prototype.readState = function (message) {
//    return (message.readUInt8(129)) ? true : false;
//}

//DomotigaPlatform.prototype.readName = function (message) {
//    return (message.toString('ascii', 48, 79));
//}
