/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v1.0 which accompany this distribution.
 *
 * The Eclipse Public License is available at
 *   http://www.eclipse.org/legal/epl-v10.html
 * and the Eclipse Distribution License is available at
 *   http://www.eclipse.org/org/documents/edl-v10.php.
 *
 * Contributors:
 *   Bryan Boyd - Initial implementation
 *******************************************************************************/
(function(window) {
	var ax = 0,
	ay = 0,
	az = 0,
	oa = 0,
	ob = 0,
	og = 0;

	var client;
	var iot_host;
	var iot_port;
	var iot_clientid;
	var iot_username;
	var iot_password;
	var topic;

	var isConnected = false;

	var last_sample = {};
	var shifted_filter = {};
	// High-pass filter to remove gravity offset from the acceleration waveforms
	function filterOffset(sample, channel) {
		if(sample === null || sample === undefined) return 0;
		if(last_sample[channel] === undefined) last_sample[channel] = sample;
		if(shifted_filter[channel] === undefined) shifted_filter[channel] = 0;
		var shiftedFCL = shifted_filter[channel] + ((sample-last_sample[channel])*256);
		shifted_filter[channel] = shiftedFCL - (shiftedFCL/256);
		last_sample[channel] = sample;
		return ((shifted_filter[channel]+128)/256);
	}

	window.ondevicemotion = function(event) {
		ax = parseFloat((event.acceleration.x || filterOffset(event.accelerationIncludingGravity.x, "ax") || 0));
		ay = parseFloat((event.acceleration.y || filterOffset(event.accelerationIncludingGravity.y, "ay") || 0));
		az = parseFloat((event.acceleration.z || filterOffset(event.accelerationIncludingGravity.z, "az") || 0));

		document.getElementById("accx").innerHTML = ax.toFixed(2);
		document.getElementById("accy").innerHTML = ay.toFixed(2);
		document.getElementById("accz").innerHTML = az.toFixed(2);
	};

	window.ondeviceorientation = function(event) {
		oa = (event.alpha || 0);
		ob = (event.beta || 0);
		og = (event.gamma || 0);

		if (event.webkitCompassHeading) {
			oa = -event.webkitCompassHeading;
		}

		document.getElementById("alpha").innerHTML = oa.toFixed(2);
		document.getElementById("beta").innerHTML = ob.toFixed(2);
		document.getElementById("gamma").innerHTML = og.toFixed(2);
	};

	window.msgCount = 0;

	function publish() {
		// We only attempt to publish if we're actually connected, saving CPU and battery
		if (isConnected) {
			var payload = {
				"d": {
					"id": window.deviceId,
					"ts": (new Date()).getTime(),
					"ax": parseFloat(ax.toFixed(2)),
					"ay": parseFloat(ay.toFixed(2)),
					"az": parseFloat(az.toFixed(2)),
					"oa": parseFloat(oa.toFixed(2)),
					"ob": parseFloat(ob.toFixed(2)),
					"og": parseFloat(og.toFixed(2))
				}
			};
			var message = new Paho.MQTT.Message(JSON.stringify(payload));
			message.destinationName = topic;
			try {
				window.client.send(message);
				window.msgCount += 1;
				$("#msgCount").html(window.msgCount);
				console.log("[%s] Published", new Date().getTime());
			} catch (err) {
				console.error(err);
				isConnected = false;
				changeConnectionStatusImage("images/disconnected.svg");
				document.getElementById("connection").innerHTML = "Disconnected";
				setTimeout(connectDevice(), 1000);
			}
		}
	}

	function onConnectSuccess() {
		// The device connected successfully
		console.log("Connected Successfully!");
		isConnected = true;
		changeConnectionStatusImage("images/connected.svg");
		document.getElementById("status_message").innerHTML = "";
		document.getElementById("connection").innerHTML = "Connected";
	}

	function onConnectFailure() {
		// The device failed to connect. Let's try again in one second.
		document.getElementById("status_message").innerHTML = "Could not connect to IBM Watson IoT Platform! Trying again in one second.";
		console.log("Could not connect to IBM Watson IoT Platform! Trying again in one second.");
		setTimeout(connectDevice(), 1000);
	}

	function connectDevice() {
		topic = "iot-2/evt/sensorData/fmt/json";
		console.log(window.deviceId, window.password);
		$("#deviceId").html(window.deviceId);

		changeConnectionStatusImage("images/connecting.svg");
		document.getElementById("connection").innerHTML = "Connecting";
		console.log("Connecting device to IBM Watson IoT Platform...");
		window.client.connect({
			onSuccess: onConnectSuccess,
			onFailure: onConnectFailure,
			userName: "use-token-auth",
			password: window.password
		});
	}

	function getCredentials() {

	}

	function registerDevice() {
		console.log("Attempting connect");
		connectDevice();
		setInterval(publish, 1000);
	}

	function changeConnectionStatusImage(image) {
		// document.getElementById("connectionImage").src = image;
	}

	function getParameterByName(name) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
		return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	$("#connect").on("click", function() {
		var org = $("input[name=org]").val();
		window.iot_host = org + ".messaging.internetofthings.ibmcloud.com";
		window.iot_port = 1883;
		window.devicetype = $("input[name=devicetype]").val();
		window.deviceId = $("input[name=device]").val();
		window.password = $("input[name=token]").val();
		window.iot_clientid = "d:"+org+":" + window.devicetype  + ":" + window.deviceId;
		window.client = new Paho.MQTT.Client(window.iot_host, window.iot_port, window.iot_clientid);
		registerDevice();
  });

}(window));
