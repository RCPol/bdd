/**
 * Created by Ali on 8/23/2016.
 */
var assert = require('assert');
var oneandone = require('../lib/liboneandone');
var helper = require('../test/testHelper');
var firewallPolicyName = "TestfirewallPolicyNode.js1";
var firewallPolicy = {};
var loadBalancerName = "TestLoadBalancerNode.js1";
var loadBalancer = {};
var serverName = "ExampleServerNode.js1";
var server = {};
var publicIpId = "";


(function () {
    oneandone.oneandoneauth("token");
    oneandone.setendpoint("https://cloudpanel-api.1and1.com/v1");

//create a firewall policy
//define the required rules
    console.log("Creating Firewall Policy with name ", firewallPolicyName);
    var firewallData = {
        "name": firewallPolicyName,
        "description": "My firewall policy description",
        "rules": [
            {
                "protocol": "TCP",
                "port_from": 80,
                "port_to": 80,
                "source": "0.0.0.0"
            },
            {
                "protocol": "TCP",
                "port_from": 443,
                "port_to": 443,
                "source": "0.0.0.0"
            },
            {
                "protocol": "TCP",
                "port_from": 8447,
                "port_to": 8447,
                "source": "0.0.0.0"
            },
            {
                "protocol": "TCP",
                "port_from": 3389,
                "port_to": 3389,
                "source": "0.0.0.0"
            },
            {
                "protocol": "TCP",
                "port_from": 8443,
                "port_to": 8443,
                "source": "0.0.0.0"
            }
        ]
    };
    //oneandone.getFirewallPolicy("88E3E9FF1D87E09AEC77F2E32EA35080", function (error, response, body) {
    oneandone.createFirewallPolicy(firewallData, function (error, response, body) {
        firewallPolicy = JSON.parse(body);
        console.log("Creating LoadBalancer with name " + loadBalancerName);
        var balancerData = {
            "name": loadBalancerName,
            "description": "My load balancer description",
            "health_check_test": oneandone.HealthCheckTestTypes.TCP,
            "health_check_interval": 1,
            "health_check_path": "path",
            "health_check_parser": null,
            "persistence": true,
            "persistence_time": 200,
            "method": oneandone.LoadBalancerMethod.ROUND_ROBIN,
            "rules": [
                {
                    "protocol": "TCP",
                    "port_balancer": 80,
                    "port_server": 80,
                    "source": "0.0.0.0"
                },
                {
                    "protocol": "TCP",
                    "port_balancer": 9999,
                    "port_server": 8888,
                    "source": "0.0.0.0"
                }
            ]
        };
        //oneandone.getLoadBalancer("098CDA4F62CA04911A1CF3BA448AEAB3", function (error, response, body) {
        oneandone.createLoadBalancer(balancerData, function (error, response, body) {
            loadBalancer = JSON.parse(body);
            var publicIpData = {
                "reverse_dns": "node.com",
                "type": oneandone.IPType.IPV4
            };
            //create a public IP and use it for the server creation
            console.log("Creating IP.....");
            oneandone.createPublicIp(publicIpData, function (error, response, body) {
                var publicIp = JSON.parse(body);
                publicIpId = publicIp.id;
                console.log("Creating Server with name 'Example Server Node.js'");
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
                        var serverData = {
                            "name": serverName,
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
                            "server_type":"cloud",
                            "ip_id": publicIpId,
                            "appliance_id": appliance.id,
                            "datacenter_id": dataCenter.id
                        };
                        //oneandone.getServer("C864493A796172E36131AE3F6410ACD0", function (error, response, body) {
                        oneandone.createServer(serverData, function (error, response, body) {
                            server = JSON.parse(body);
                            //check if the server is deployed and ready for further operations
                            helper.checkServerReady(server, function () {
                                helper.updateServerData(server, function (result) {
                                    server = result;
                                    console.log("Server is Powered up and running");
                                    //attaching a firewall policy to the server after creation:
                                    //Get a windows firewall policy by sending the query parameter Windows
                                    console.log("Assigning " + firewallPolicyName + "to " + serverName);
                                    var firewallPolicyData = {
                                        "id": firewallPolicy.id
                                    };
                                    oneandone.addFirewallPolicy(server.id, server.ips[0].id, firewallPolicyData, function (error, response, body) {
                                        console.log("Assigning " + loadBalancerName + "to " + serverName);
                                        // attaching a loadbalancer to the server
                                        var loadBalancerData = {
                                            "load_balancer_id": loadBalancer.id
                                        };
                                        oneandone.addIpLoadBalancer(server.id, server.ips[0].id, loadBalancerData, function (error, response, body) {
                                            //cleaning up
                                            console.log("Cleaning up all the created test data");
                                            oneandone.deleteServer(server.id, false, function (error, response, body) {
                                                console.log("Server removed");
                                                oneandone.deleteLoadBalancer(loadBalancer.id, function (error, response, body) {
                                                    console.log("loadbalancer removed");
                                                    oneandone.deleteFirewallPolicy(firewallPolicy.id, function (error, response, body) {
                                                        console.log("firewall removed");
                                                        oneandone.deletePublicIp(publicIpId, function (error, response, body) {
                                                            console.log("public ip removed");
                                                            console.log("Finished cleaning ");
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
})();