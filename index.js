var PanasonicCommands = require('viera.js');
var http = require('http');
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-panasonic", "Panasonic-TV", PanasonicTV);
};

// Configure TV
function PanasonicTV(log, config) {
    this.log = log;
    this.config = config;
    this.name = config["name"];
    this.HOST = config["ipaddress"];
};

PanasonicTV.prototype.getServices = function() {
    // Configure HomeKit TV Device Information
    this.deviceInformation = new Service.AccessoryInformation();
    this.deviceInformation
        .setCharacteristic(Characteristic.Manufacturer, "Panasonic")
        .setCharacteristic(Characteristic.Model, "Unknown")
        .setCharacteristic(Characteristic.SerialNumber, "Unknown");

    // Configure HomeKit TV Accessory
    this.tvService = new Service.Television(this.name, "Television");
    this.tvService.setCharacteristic(Characteristic.ConfiguredName, this.name);
    this.tvService.setCharacteristic(Characteristic.SleepDiscoveryMode, 1);
  
    this.tvService.getCharacteristic(Characteristic.Active)
        .on("get", this.getOn.bind(this))
        .on("set", this.setOn.bind(this));
    this.tvService.setCharacteristic(Characteristic.ActiveIdentifier, 1);

    this.tv = new PanasonicCommands(this.HOST)

    return [this.deviceInformation, this.tvService];
}

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    let self = this;

    let getRequest = {
        host: self.HOST,
        port: 55000,
        timeout: 1000,
        method: "GET",
        path: "/nrc/control_0"
    };

    var timedOut = false;
    let request = http.request(getRequest, result => {
        self.log("Getting power status...");

        result.setEncoding('utf8');

        result.on('data', data => {
            self.log("Response recieved: " + data);
        });
        result.on('end', () => {
            self.log("Responded, TV is on.");
            callback(null, true);
        });
    });

    request.on('timeout', () => {
        self.log("Did not respond. TV is off.");
        request.abort();
        timedOut = true;
    });

    request.on('error', error => {
        if (!timedOut) {
            callback(null, false);
        } else {
            callback(error, false);
        }
    });

    request.end();
}

PanasonicTV.prototype.setOn = function(isOn, callback) {
    let self = this;

    if (isOn) {
        self.log("Attempting power off...");
        self.tv.sendCommand("POWER");
        callback(null, !isOn);
    } else {
        self.log("Attempting power on...");
        self.tv.sendCommand("POWER");
        callback(null, !isOn);
    }
}
