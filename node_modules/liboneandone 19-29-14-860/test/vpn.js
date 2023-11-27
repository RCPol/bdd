/**
 * Created by Ali on 8/13/2016.
 */
var assert = require('assert');
var oneandone = require('../lib/liboneandone');
var helper = require('../test/testHelper');
var vpn = {};

describe('Vpns tests', function () {
    this.timeout(900000);

    before(function (done) {
        helper.authenticate(oneandone);
        var vpnData = {
            "name": "node VPN",
            "description": "My VPN description"
        };
        oneandone.createVpn(vpnData, function (error, response, body) {
            helper.assertNoError(202, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            vpn = JSON.parse(body);
            done();
        });
    });

    removeVpn = function (vpnToRemove, callback) {
        if (vpnToRemove.id) {
            oneandone.deleteVpn(vpnToRemove.id, function (error, response, body) {
                callback();
            });
        }
        else {
            callback();
        }
    };

    after(function (done) {
        removeVpn(vpn, function () {
            done();
        });
    });

    it('List vpns', function (done) {
        oneandone.listVpns(function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            var object = JSON.parse(body);
            assert(object.length > 0);
            done();
        });
    });

    it('List vpns with options', function (done) {
        var options = {
            query: "node"
        };

        setTimeout(function () {
            oneandone.listVpnsWithOptions(options, function (error, response, body) {
                helper.assertNoError(200, response, function (result) {
                    assert(result);
                });
                assert.notEqual(response, null);
                assert.notEqual(body, null);
                var object = JSON.parse(body);
                assert(object.length > 0);
                done();
            });
        }, 5000);
    });

    it('Get vpn', function (done) {
        oneandone.getVpn(vpn.id, function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            var object = JSON.parse(body);
            assert.equal(object.id, vpn.id);
            done();
        });
    });

    it('Get vpn configuration file', function (done) {
        setTimeout(function () {
            oneandone.getConfigurationFile('C:\\'+vpn.name, vpn.id, function (error, response, body) {
                helper.assertNoError(200, response, function (result) {
                    assert(result);
                });
                assert.notEqual(response, null);
                assert.notEqual(body, null);
                done();
            });
        }, 8000);
    });

    it('Update vpn', function (done) {
        updateData = {
            "name": "node VPN rename",
            "description": "node VPN rename description"
        };
        oneandone.updateVpn(vpn.id, updateData, function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            var object = JSON.parse(body);
            assert.equal(object.name, updateData.name);
            done();
        });
    });
});