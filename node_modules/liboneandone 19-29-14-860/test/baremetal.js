/**
 * Created by Ali on 7/28/2016.
 */

var assert = require('assert');
var oneandone = require('../lib/liboneandone');
var helper = require('../test/testHelper');
var server = {};
var loadBalancer = {};
var baremetalModel = {};
var currentHdd = {};
var currentImage = {};
var appliance = {};
var dataCenter = {};
var firewallPolicy = {};
var currentIp = {};


describe('Baremetal Server tests', function () {
  this.timeout(1800000);

  before(function (done) {
    helper.authenticate(oneandone);
    var options = {
      query: "baremetal"
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
        var options = {
          query: "BMC_L"
        };
        oneandone.listBaremetalModels(options,function (errpr,repsonse,body){
          var res= JSON.parse(body);
          var baremetalmodel=res[0];
          var serverData = {
            "name": "Baremetal Node Server",
            "description": "description",
            "hardware": {
              "baremetal_model_id": baremetalmodel.id
            },
            "server_type": "baremetal",
            "appliance_id": appliance.id,
            "datacenter_id": dataCenter.id
          };
          oneandone.createServer(serverData, function (error, response, body) {
            helper.assertNoError(202, response, function (result) {
              assert(result);
            });
            assert.equal(error, null);
            server = JSON.parse(body);
            assert.notEqual(response, null);
            assert.notEqual(body, null);
            assert.equal(server.name, serverData.name)
            var balancerData = {
              "name": "bm node balancer",
              "description": "My load balancer description",
              "health_check_test": oneandone.HealthCheckTestTypes.TCP,
              "health_check_interval": 300,
              "persistence": true,
              "persistence_time": 60,
              "method": oneandone.LoadBalancerMethod.ROUND_ROBIN,
              "rules": [
                {
                  "protocol": "TCP",
                  "port_balancer": 80,
                  "port_server": 80,
                  "source": "0.0.0.0"
                }
              ]
            };
            helper.checkServerReady(server, function () {
              oneandone.createLoadBalancer(balancerData, function (error, response, body) {
                helper.assertNoError(202, response, function (result) {
                  assert(result);
                });
                assert.notEqual(response, null);
                loadBalancer = JSON.parse(body);
                var firewallData = {
                  "name": "bm node firewall policy",
                  "description": "My firewall policy description",
                  "rules": [
                    {
                      "protocol": "UDP",
                      "port_from": 161,
                      "port_to": 162,
                      "source": "0.0.0.0"
                    }
                  ]
                };
                helper.checkServerReady(server, function () {
                  oneandone.createFirewallPolicy(firewallData, function (error, response, body) {
                    helper.assertNoError(202, response, function (result) {
                      assert(result);
                    });
                    assert.notEqual(response, null);
                    firewallPolicy = JSON.parse(body);
                    done();
                  });
                });
              });
            });
        });
      });
    });
  });
});

  removeServer = function (serverToRemove, callback) {
    if (server.id) {
      helper.checkServerReady(serverToRemove, function () {
        oneandone.deleteServer(serverToRemove.id, false, function (error, response, body) {
          helper.assertNoError(202, response, function (result) {
            assert(result);
          });
          callback();
        });
      });
    }
    else {
      callback();
    }
  };

  removeFirewallPolicy = function (firewallToRemove, callback) {
    if (firewallToRemove.id) {
      oneandone.deleteFirewallPolicy(firewallToRemove.id, function (error, response, body) {
        callback();
      });
    }
    else {
      callback();
    }
  };
  removeLoadBalancer = function (toRemove, callback) {
    if (toRemove.id) {
      oneandone.deleteLoadBalancer(toRemove.id, function (error, response, body) {
        callback();
      });
    }
    else {
      callback();
    }
  };
  after(function (done) {
    removeServer(server, function () {
      removeFirewallPolicy(firewallPolicy, function () {
        removeLoadBalancer(loadBalancer, function () {
          done();
        });
      });
    });
  });

  it('List servers with options', function (done) {
    var options = {
      query: "baremetal"
    };
    oneandone.listServersWithOptions(options, function (error, response, body) {
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

  it('List Bare metal Model', function (done) {
    oneandone.listBaremetalModels(null,function (error, response, body) {
      helper.assertNoError(200, response, function (result) {
        assert(result);
      });
      assert.notEqual(response, null);
      assert.notEqual(body, null);
      var object = JSON.parse(body);
      assert(object.length > 0);
      baremetalModel = object[0];
      done();
    });
  });

  it('Get Bare metal Model', function (done) {
    oneandone.getBaremetalModel(baremetalModel.id, function (error, response, body) {
      helper.assertNoError(200, response, function (result) {
        assert(result);
      });
      assert.notEqual(response, null);
      assert.notEqual(body, null);
      done();
    });
  });

  it('Get server status', function (done) {
    oneandone.getServerStatus(server.id, function (error, response, body) {
      helper.assertNoError(200, response, function (result) {
        assert(result);
      });
      assert.notEqual(response, null);
      assert.notEqual(body, null);
      done();
    });
  });

  it('Get server', function (done) {
    oneandone.getServer(server.id, function (error, response, body) {
      helper.assertNoError(200, response, function (result) {
        assert(result);
      });
      assert.notEqual(response, null);
      assert.notEqual(body, null);
      var object = JSON.parse(body);
      server=object;

      assert.equal(object.id, server.id);
      assert.equal(object.name, server.name);
      done();
    });
  });

  it('Add Ip to the server', function (done) {
    ipData = {
      "type": "IPV4"
    };
    helper.checkServerReady(server, function () {
      oneandone.addIp(server.id, ipData, function (error, response, body) {
        helper.assertNoError(201, response, function (result) {
          assert(result);
        });
        var result = JSON.parse(body);
        currentIp=result.ips[1];
        helper.checkServerReady(server, function () {
          assert.notEqual(response, null);
          assert.notEqual(body, null);
          assert.notEqual(result, null);
          done();
        });
      });
    });
  });

  it('Add LoadBalancer to an IP', function (done) {
      loadBalancerData = {
        "load_balancer_id": loadBalancer.id
      };
      helper.checkServerReady(server, function () {
        oneandone.addIpLoadBalancer(server.id, currentIp.id, loadBalancerData, function (error, response, body) {
          helper.assertNoError(202, response, function (result) {
            assert(result);
          });
          assert.notEqual(body, null);
          done();
        });
      });
  });

  it('List ip Load Balancers', function (done) {
    helper.checkServerReady(server, function () {
      oneandone.listIpLoadBalancer(server.id, currentIp.id, function (error, response, body) {
        helper.assertNoError(200, response, function (result) {
          assert(result);
        });
        assert.notEqual(body, null);
        var object = JSON.parse(body);
        assert(object.length > 0);
        done();
      });
    });
  });

  it('Remove Load Balancers from  an IP', function (done) {
    helper.checkServerReady(server, function () {
      oneandone.deleteIpLoadBalancer(server.id, currentIp.id, loadBalancer.id, function (error, response, body) {
        helper.assertNoError(202, response, function (result) {
          assert(result);
        });
        assert.notEqual(response, null);
        assert.notEqual(body, null);
        done();
      });
    });
  });

  it('Add Firewall Policy to an IP', function (done) {
    helper.checkServerReady(server, function () {
      oneandone.listFirewallPolicies(function (fpError, fpResponse, fpBody) {
        var object = JSON.parse(fpBody);
        firewallPolicyData = {
          "id": firewallPolicy.id
        };
        oneandone.addFirewallPolicy(server.id, currentIp.id, firewallPolicyData, function (error, response, body) {
          helper.checkServerReady(server, function () {
            helper.assertNoError(202, response, function (result) {
              assert(result);
            });
            assert.notEqual(body, null);
            done();
          });
        });
      });

    });
  });

  it('List ip FirewallPolicies', function (done) {
    helper.checkServerReady(server, function () {
      oneandone.listIpFirewallPolicies(server.id, currentIp.id, function (error, response, body) {
        helper.assertNoError(200, response, function (result) {
          assert(result);
        });
        assert.notEqual(body, null);
        var object = JSON.parse(body);
        if (Array.isArray(object)) {
          assert(object.length > 0);
        }
        done();
      });
    });
  });

  it('Update server', function (done) {
    updateData = {
      "name": "Baremetal Node Server - UPDATED",
      "description": "desc",

    };
    helper.checkServerReady(server, function () {
      setTimeout(function () {
        oneandone.updateServer(server.id, updateData, function (error, response, body) {
          helper.assertNoError(200, response, function (result) {
            assert(result);
          });
          assert.notEqual(response, null);
          assert.notEqual(body, null);
          var object = JSON.parse(body);
          assert.equal(object.id, server.id);
          assert.equal(object.name, updateData.name);
          assert.equal(object.description, updateData.description);
          done();
        });
      }, 12000);
    });
  });

  it('Update server status', function (done) {
    updateData = {
      "action": oneandone.ServerUpdateAction.REBOOT,
      "method": oneandone.ServerUpdateMethod.SOFTWARE

    };
    helper.checkServerReady(server, function () {
      oneandone.updateServerStatus(server.id, updateData, function (error, response, body) {
        helper.assertNoError(202, response, function (result) {
          assert(result);
        });
        assert.notEqual(response, null);
        assert.notEqual(body, null);
        var object = JSON.parse(body);
        assert.equal(object.id, server.id);
        done();
      });
    });
  });

  it('Get Server Hardware', function (done) {
    oneandone.getHardware(server.id, function (error, response, body) {
      helper.assertNoError(200, response, function (result) {
        assert(result);
      });
      assert.notEqual(response, null);
      assert.notEqual(body, null);
      done();
    });
  });

  it('List Servers HDDs ', function (done) {
    helper.checkServerReady(server, function () {
      oneandone.listHdds(server.id, function (error, response, body) {
        helper.assertNoError(200, response, function (result) {
          assert(result);
        });
        assert.notEqual(body, null);
        var object = JSON.parse(body);
        assert(object.length > 0);
        currentHdd = object[0];
        done();
      });
    });
  });

  it('Get Server specific Hdd', function (done) {
    oneandone.getHdd(server.id, currentHdd.id, function (error, response, body) {
      helper.assertNoError(200, response, function (result) {
        assert(result);
      });
      assert.notEqual(response, null);
      assert.notEqual(body, null);
      done();
    });
  });

  it('Get Server Image', function (done) {
    helper.checkServerReady(server, function () {
      oneandone.getServerImage(server.id, function (error, response, body) {
        helper.assertNoError(200, response, function (result) {
          assert(result);
        });
        assert.notEqual(response, null);
        assert.notEqual(body, null);
        var object = JSON.parse(body);
        currentImage = object;
        done();
      });
    });
  });

});
