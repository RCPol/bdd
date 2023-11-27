/**
 * Created by Ali on 8/16/2016.
 */
var assert = require('assert');
var oneandone = require('../lib/liboneandone');
var helper = require('../test/testHelper');
var user = {};
var userData = {
    "name": " node user",
    "description": "User description",
    "password": "test2015",
    "email": "test@arsys.es"
};


describe('Users tests', function () {
    this.timeout(900000);

    before(function (done) {
        helper.authenticate(oneandone);
        oneandone.createUser(userData, function (error, response, body) {
            user = JSON.parse(body);
            done();
        });
    });

    removeUser = function (userToRemove, callback) {
        if (userToRemove.id) {
            oneandone.deleteUser(userToRemove.id, function (error, response, body) {
                callback();
            });
        }
        else {
            callback();
        }
    };

    after(function (done) {
        removeUser(user, function () {
            done();
        });
    });

    it('List users', function (done) {
        oneandone.listUsers(function (error, response, body) {
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

    it('List users with options', function (done) {
        var options = {
            query: "node"
        };

        setTimeout(function () {
                oneandone.listUsersWithOptions(options, function (error, response, body) {
                helper.assertNoError(200, response, function (result) {
                    assert(result);
                });
                assert.notEqual(response, null);
                assert.notEqual(body, null);
                var object = JSON.parse(body);
                user = object[0];
                assert(object.length > 0);
                done();
            });
        }, 5000);
    });

    it('Get user', function (done) {
        oneandone.getUser(user.id, function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            var object = JSON.parse(body);
            assert.equal(object.id, user.id);
            done();
        });
    });

    it('Update user', function (done) {
        updateData = {
            "name": "Manager role",
            "description": "Manager role description",
            "state": "ACTIVE"
        };
        //this is not allowed by API permissions
        //oneandone.updateUser(user.id, updateData, function (error, response, body) {
        //    assert.equal(error, null);
        //    assert.notEqual(response, null);
        //    assert.notEqual(body, null);
        //    var object = JSON.parse(body);
        //    assert.equal(object.name, updateData.name);
        //    done();
        //});
        done();
    });

    it('Get user API information', function (done) {
        oneandone.getUserApiInformation(user.id, function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            done();
        });
    });

    it('Update user API Information', function (done) {
        updateApi = {
            "active": true
        };
        oneandone.updateUserApiInformation(user.id, updateApi, function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            done();
        });
    });

    it('Get user API Key', function (done) {
        oneandone.getUserApiKey(user.id, function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            done();
        });
    });

    it('Update user API Key', function (done) {
        //this will change the API key remove the commented code below to try it
        //oneandone.updateUserApiKey(user.id, function (error, response, body) {
        //      helper.assertNoError(200, response, function (result) {
        //    assert(result);
        //});
        //    assert.notEqual(response, null);
        //    assert.notEqual(body, null);
        //    done();
        //});
        done();
    });

    it('Get user API allowed IPs', function (done) {
        oneandone.getUserApiAllowedIPs(user.id, function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            done();
        });
    });

    var ipToAllow = "46.32.120.23";//must be your IP in order for the tests to finish
    it('Allow a new IP', function (done) {
        ipList = {
            "ips": [
                ipToAllow
            ]
        };
        //this will block all other ips except the ip below
        //oneandone.addUserAPIAllowedIPs(user.id, ipList, function (error, response, body) {
        //    assert.equal(error, null);
        //    assert.notEqual(response, null);
        //    assert.notEqual(body, null);
        //    done();
        //});
        done();
    });

    it('Delete IP', function (done) {
        //oneandone.deleteUserAPIAllowedIPs(user.id, ipToAllow, function (error, response, body) {
        //    assert.equal(error, null);
        //    assert.notEqual(response, null);
        //    assert.notEqual(body, null);
        //    done();
        //});
        done();
    });

    it('Get user permissions', function (done) {
        oneandone.getCurrentUserPermissions(function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            done();
        });
    });

});