/**
 * Created by Ali on 8/13/2016.
 */
var fs = require('fs');
module.exports = {
    vpnEndPointPath: "vpns",

    listVpns: function (callback) {
        req.is_get([this.vpnEndPointPath], callback)
    },

    listVpnsWithOptions: function (options, callback) {
        var path = this.vpnEndPointPath;
        if (options) {
            path += "?";
            if (options.page) {
                path += "&page=" + options.page;
            }
            if (options.perPage) {
                path += "&per_page=" + options.perPage;
            }
            if (options.sort) {
                path += "&sort=" + options.sort;
            }
            if (options.query) {
                path += "&q=" + options.query;
            }
            if (options.fields) {
                path += "&fields=" + options.fields;
            }
        }

        req.is_get([path], callback)
    },

    createVpn: function (json, callback) {
        req.is_post([this.vpnEndPointPath], json, callback)
    },

    getVpn: function (vpn_id, callback) {
        req.is_get([this.vpnEndPointPath, vpn_id], callback)
    },

    getConfigurationFile: function (filepath, vpn_id, callback) {
        req.is_get([this.vpnEndPointPath, vpn_id, "configuration_file"], function (error, response, body) {
            var object = JSON.parse(body);
            var base64Data  =   object.config_zip_file;
            base64Data  +=  base64Data.replace('+', ' ');
            binaryData  =   new Buffer(base64Data, 'base64').toString('binary');
            fs.writeFile(filepath+'.zip', binaryData, "binary", function (err) {
                console.log(err); // writes out file without error
                callback(err, response, body);
            });
        });

    },

    updateVpn: function (vpn_id, json, callback) {
        req.is_put([this.vpnEndPointPath, vpn_id], json, callback)
    },

    deleteVpn: function (vpn_id, callback) {
        req.is_del([this.vpnEndPointPath, vpn_id], callback)
    },
}