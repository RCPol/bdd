/**
 * Created by Ali on 8/6/2016.
 */
var assert = require('assert');
var oneandone = require('../lib/liboneandone');
var helper = require('../test/testHelper');
var server = {};
var image = {};
var appliance = {};
var dataCenter = {};

describe('Images tests', function () {
    this.timeout(1800000);

    before(function (done) {
        helper.authenticate(oneandone);
        var options = {
            query: "centos"
        };
        oneandone.listServerAppliancesWithOptions(options, function (error, response, body) {
            var res = JSON.parse(body);
            appliance = res[0];
            var options = {
                query: "us"
            };
            oneandone.listDatacentersWithOptions(options, function (error, response, body) {
                var res1 = JSON.parse(body);
                dataCenter = res1[0];
            });
            var serverData = {
                "name": "Node Image Server1",
                "description": "description",
                "hardware": {
                    "vcore": 2,
                    "cores_per_processor": 1,
                    "ram": 2,
                    "hdds": [
                        {
                            "size": 40,
                            "is_main": true
                        },
                        {
                            "size": 20,
                            "is_main": false
                        }
                    ]
                },
                "appliance_id": appliance.id,
                "datacenter_id": dataCenter.id
            };

            oneandone.createServer(serverData, function (error, response, body) {
                server = JSON.parse(body);
                var imageData = {
                    "server_id": server.id,
                    "name": "node image3",
                    "description": "My image description",
                    "frequency": oneandone.ImageFrequency.WEEKLY,
                    "num_images": 1
                };
                helper.checkServerReady(server, function () {
                    oneandone.createImage(imageData, function (error, response, body) {
                        helper.assertNoError(202, response, function (result) {
                            assert(result);
                        });
                        assert.notEqual(response, null);
                        image = JSON.parse(body);
                        done();
                    });
                });
            });
        });
    });

    removeServer = function (serverToRemove, callback) {
        if (serverToRemove.id) {
            helper.checkServerReady(serverToRemove, function () {
                oneandone.deleteServer(serverToRemove.id,false, function (error, response, body) {
                    callback();
                });
            });
        }
        else {
            callback();
        }
    };

    removeImage = function (imageToRemove, callback) {
        if (imageToRemove.id) {
            oneandone.deleteImage(imageToRemove.id, function (error, response, body) {
                callback();
            });
        }
        else {
            callback();
        }
    };
    after(function (done) {
        removeImage(image, function () {
            setTimeout(function () {
                removeServer(server, function () {
                    done();
                });
            }, 100000);
        });
    });

    it('List images', function (done) {
        oneandone.listImages(function (error, response, body) {
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

    it('List images with options', function (done) {
        var options = {
            query: "node"
        };

        setTimeout(function () {
            oneandone.listImagesWithOptions(options, function (error, response, body) {
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

    it('Get image', function (done) {
        oneandone.getImage(image.id, function (error, response, body) {
            helper.assertNoError(200, response, function (result) {
                assert(result);
            });
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            var object = JSON.parse(body);
            assert.equal(object.id, image.id);
            done();
        });
    });

    it('Update image', function (done) {
        updateData = {
            "name": "image updated nodejs",
            "description": "New image description",
            "frequency": oneandone.ImageFrequency.ONCE
        };
        helper.checkImageReady(image, function () {
            oneandone.updateImage(image.id, updateData, function (error, response, body) {
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

});
