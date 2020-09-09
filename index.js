#!/bin/env node

const inquirer = require('inquirer');
const ewelink = require('ewelink-api');
const chalk = require('chalk');
const figlet = require('figlet');

require('dotenv').config();
if (!process.env.EWELINK_EMAIL || !process.env.EWELINK_PASSWORD) {
    console.log('Setup you credentials (EWELINK_EMAIL, EWELINK_PASSWORD), on a .env file');
    process.exit(1);
}
//conexao com o ewelink
const connection = new ewelink({
    email: process.env.EWELINK_EMAIL,
    password: process.env.EWELINK_PASSWORD,
    region: process.env.EWELINK_REGION || 'us'
});

const maxNumberMultiSwitchDevices = 2;

const getDevices = async () => {
    return await connection.getDevices();
};

const mapDevicesToChoices = (devices) => {
    if (!devices || !devices.length) {
        return;
    }

    let arrayToReturn = [];
    devices.map(d => {
        if (d.params && d.params.switches) {
            d.params.switches.forEach(s => {
                if (s.outlet < maxNumberMultiSwitchDevices) {
                    arrayToReturn.push({
                        name: `[${(s.switch && s.switch === 'on' ? chalk.green('On') : chalk.red('Off'))}] ${d.name} - Channel: ${s.outlet + 1}`,
                        value: {id: d.deviceid, channel: (s.outlet + 1), state: s.switch, name: d.name}
                    })
                }
            });
        } else if (d.params && d.params.switch) {
            arrayToReturn.push({
                name: d.name,
                value: {id: d.deviceid, state: d.params.switch, name: d.name}
            })
        }
    });
    return arrayToReturn;

};

const initialOptionsInquirer = async () => {
    let exit = false;
    console.log('Loading devices...');
    let devices = await getDevices();
    let devicesChoices = mapDevicesToChoices(devices);
    while (!exit) {
        //update the names with state (on/off)
        devicesChoices.forEach(d => {
            d.name = `[${(d.value.state === 'on' ? chalk.green('On') : chalk.red('Off'))}] ${d.value.name}${d.value.channel ?  ` - Channel: ${d.value.channel}` : ''}`
        });
        let choices = [...devicesChoices, {name: "I'm done", value: "exit"}];
        let answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedDevice',
                choices: choices
            }
        ]);
        if (answer && answer.selectedDevice && answer.selectedDevice !== 'exit') {
            let response;
            if (answer.selectedDevice.id && answer.selectedDevice.channel == undefined) {
                response = await connection.toggleDevice(`${answer.selectedDevice.id}`);
            } else {
                response = await connection.toggleDevice(`${answer.selectedDevice.id}`, answer.selectedDevice.channel);
            }
            if (response && response.status === 'ok') {
                // console.log(chalk.blue(`Device status updated!`));
                // console.log(response, answer, devicesChoices);
                let device = devicesChoices.find(d => d.value.id === answer.selectedDevice.id && ((d.value.channel !== undefined && d.value.channel === answer.selectedDevice.channel) || d.value.channel === undefined));
                device.value.state = device.value.state === 'on' ? 'off' : 'on';
            } else {
                console.log(chalk.red('error', response));
            }
        }
        exit = (answer.selectedDevice === "exit");
    }
};

const init = () => {
    //texto inicial
    console.log(chalk.green(figlet.textSync('eWeLink Home CLI')));
    initialOptionsInquirer();
};

init();