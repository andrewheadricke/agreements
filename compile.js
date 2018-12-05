var fs = require('fs');
var dir = './build';
var exec = require('child_process').execSync;

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

if (process.argv.length < 3) {
    console.log("Need to pass in contract name");
    process.exit(1);
}

var contractName = process.argv[2];

try {    
    exec('solc contracts/' + contractName + '.sol --combined-json abi,bin --optimize > build/' + contractName + '.json');
}
catch (ex) {
    process.exit(1);
}

var binOutput = fs.readFileSync("build/" + contractName + ".json", "utf8");
jsonBinOutput = JSON.parse(binOutput);

for (var prop in jsonBinOutput.contracts) {
    console.log(prop + " - " + jsonBinOutput.contracts[prop].bin.length / 2 + " bytes")
}
