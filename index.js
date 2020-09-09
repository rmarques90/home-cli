#!/bin/env node

const inquirer = require('inquirer');
const ewelink = require('ewelink-api');
const Table = require('cli-table');
const chalk = require('chalk');
const figlet = require('figlet');

require('dotenv').config();

//conexao com o ewelink
const connection = new ewelink({
    email: process.env.EWELINK_EMAIL,
    password: process.env.EWELINK_PASSWORD,
    region: process.env.EWELINK_REGION
});

const maxNumberMultiSwitchDevices = 2;

//função para gerar tabela
const showDevicesTable = (devicesData) => {
    const table = new Table({
        head: [chalk.cyan('Name'), chalk.cyan('Status')],
        colWidths: [15, 15]
    });

    if (devicesData) {
        devicesData.map((d) => {
            if (d.params && d.params.switches) {
                d.params.switches.forEach(s => {
                    if (s.outlet < maxNumberMultiSwitchDevices) { //soh tenho switch com 2 botoes e o infeliz me retorna 4
                        table.push([
                            `${d.name} - ${s.outlet}`, (s.switch && s.switch === 'on' ? chalk.green('On') : chalk.red('Off'))
                        ])
                    }
                })
            } else if (d.params && d.params.switch) {
                table.push([
                    d.name, (d.params && d.params.switch && d.params.switch === 'on' ? chalk.green('On') : chalk.red('Off'))
                ])
            }
        });
    }

    console.log(table.toString());
};

const getDevices = async () => {
    return await connection.getDevices();
};

const listDevices = async () => {
    let devices = await getDevices();
    showDevicesTable(devices);
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
                        name: `${d.name} - Channel: ${s.outlet + 1}`,
                        value: {id: d.deviceid, channel: (s.outlet + 1)}
                    })
                }
            });
        } else if (d.params && d.params.switch) {
            arrayToReturn.push({
                name: d.name,
                value: {id: d.deviceid}
            })
        }
    });
    return arrayToReturn;

};

const initialOptionsInquirer = () => {
    inquirer.prompt([
        {
            type: 'list',
            name: 'option',
            message: 'What do you wanna do?',
            choices: [
                {name: 'List all devices status', value: 1},
                {name: 'Toggle some device', value: 2},
                {name: 'Exit', value: 3}
            ]
        }
    ])
        .then( async answer => {
            if (answer.option === 1) {
                await listDevices();
                initialOptionsInquirer();
            } else if (answer.option === 2) {
                let devices = await getDevices();
                let choices = mapDevicesToChoices(devices);

                inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selectedDevice',
                        choices: choices
                    }
                ]).then(async answer => {
                    if (answer && answer.selectedDevice) {
                        let response;
                        if (answer.selectedDevice.id && answer.selectedDevice.channel == undefined) {
                            response = await connection.toggleDevice(`${answer.selectedDevice.id}`);
                        } else {
                            response = await connection.toggleDevice(`${answer.selectedDevice.id}`, answer.selectedDevice.channel);
                        }
                        if (response && response.status === 'ok') {
                            console.log(chalk.blue(`Device status updated!`));
                        } else {
                            console.log(chalk.red('error', response));
                        }

                        initialOptionsInquirer();
                    }
                })
            } else if (answer.option === 3) {
                console.log(chalk.green('Goodbye! =]'));
                process.exit(1);
            }
        })
};

const init = () => {
    //texto inicial
    console.log(chalk.green(figlet.textSync('eWeLink Home CLI')));

    initialOptionsInquirer();
};

init();