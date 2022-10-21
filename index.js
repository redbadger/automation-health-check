xml2js = require("xml2js");
const path = require("path");
const fs = require("fs").promises;
const { writeFile } = require("fs");
const reportPath = path.join(__dirname);
const directoryPath = path.join(__dirname, "sampleFiles");
var html_tablify = require("html-tablify");

const fullResultsByTestName = [];
let arrayOfResults = [];
let arrayOfTestNames = [];
let uniqueArrayOfTestNames;

async function testCaseResults(result) {
  for (let i = 0; i < result.length; i++) {
    result[i].testsuites.testsuite.forEach((testSuite) => {
      let numOfTests = parseInt(testSuite.$.tests);
      // loop over the array of test cases if more than one exists in the testsuite
      if (numOfTests > 1) {
        let specName = testSuite.$.name;
        console.log(`checking tests in ${specName}...`);
        testSuite.testcase.forEach((test) => {
          let obj = {
            spec: specName,
            name: test.$.name,
            duration: parseFloat(test.$.time),
            passed: test.failure ? false : true,
            failureReason: test.failure ? test.failure._ : "",
          };
          arrayOfTestNames.push(test.$.name);
          arrayOfResults.push(obj);
        });
      // get result of single test if only one exists in the test suite - no need for a loop
      } else if (numOfTests === 1) {
        let specName = testSuite.name;
        console.log(`checking test in ${specName}...`);
        let obj = {
          spec: specName,
          name: testSuite.testcase.$.name,
          duration: parseFloat(testSuite.testcase.$.time),
          passed: testSuite.testcase.failure ? false : true,
          failureReason: testSuite.testcase.failure ? test.failure._ : "",
        };
        arrayOfTestNames.push(testSuite.testcase.$.name);
        arrayOfResults.push(obj);
      } 
    });
  }

  uniqueArrayOfTestNames = await reduceTestNames(arrayOfTestNames);

  let testObject;
  let element;
  let individualTestsResults;
  const allCategorisedResults = [];

  for (let index = 0; index < uniqueArrayOfTestNames.length; index++) {
    element = uniqueArrayOfTestNames[index];

    individualTestsResults = arrayOfResults.filter(
      (test) => test.name === element
    );

    allCategorisedResults.push(individualTestsResults);
  }

  let testName;
  const allTestNameResults = [];

  for (let i = 0; i < allCategorisedResults.length; i++) {
    const element = allCategorisedResults[i];
    testName = element.name;
    allTestNameResults.push(element.passed);
    // }
  }

  async function sumOfDurations(arr, flake) {
    let count = 0;
    let countPassed = 0;
    let countFailed = 0;
    let healthMeasure = 0;
    for (let i = 0; i < arr.length; i++) {
      const duration = parseFloat(arr[i].duration);
      const outcome = arr[i].passed;
      if (duration !== 0) {
        count = count + duration;
      }

      //if the test takes longer than 2 seconds to complete or fails, we consider this an unhealthy execution
      if (duration > 2 || outcome === false) {
        healthMeasure = healthMeasure + 1;
      } else {
        healthMeasure = healthMeasure - 0.5;
      }

      if (outcome === true) {
        countPassed = countPassed + 1;
      } else {
        countFailed = countFailed + 1;
      }
    }

    return [
      count / arr.length,
      countPassed,
      countFailed,
      healthMeasure / arr.length,
    ];
  }

  async function getFlipRate(arr) {
    let flakeScore = 0;
    for (let i = 1, x = 0; i < arr.length; i++, x++) {
      let outcome = arr[i].passed;
      let pastOutcome = arr[x].passed;

      if (outcome === true) {
        if (pastOutcome === true) {
          flakeScore = flakeScore - 0.25;
        } else {
          flakeScore = flakeScore + 1;
        }
      } else if (outcome === false) {
        if (pastOutcome === true) {
          flakeScore = flakeScore + 1;
        } else {
          flakeScore = flakeScore - 0.25;
        }
      }
    }

    if (flakeScore < 0) {
      flakeScore = 0;
      return parseFloat(flakeScore);
    } else {
      return parseFloat(flakeScore / arr.length);
    }
  }

  for (let i = 0; i < allCategorisedResults.length; i++) {
    const element = allCategorisedResults[i][0].name;
    const specArea = allCategorisedResults[i][0].spec;
    const flakeRate = await getFlipRate(allCategorisedResults[i]);

    const [sum, passes, failures, healthy] = await sumOfDurations(
      allCategorisedResults[i]
    );
    let healthIndicator;

    if (healthy < 0.5 && parseFloat(flakeRate) < 0.01) {
      healthIndicator = "Healthy";
    } else {
      healthIndicator = "Unhealthy";
    }

    testObject = {
      spec: specArea,
      name: element,
      duration: sum.toFixed(2),
      passCount: passes,
      failCount: failures,
      flakeScore: flakeRate.toFixed(2),
      health: healthIndicator,
    };
    fullResultsByTestName.push(testObject);
  }

  return fullResultsByTestName;
}

async function writeJSONReport(content, name) {
  writeFile(
    `${reportPath}/${name}.json`,
    JSON.stringify(content, null, 2),
    (error) => {
      if (error) {
        console.log("An error has occurred ", error);
        return;
      }
      console.log("Data written successfully to disk");
    }
  );
}

async function createHTML(json, nameHTML) {
  var options = {
    data: json,
    cellspacing: 0,
    cellpadding: 5,
    css: "table {border: 1px solid black}",
  };
  var html_data = html_tablify.tablify(options);

  await writeHTMLReport(html_data, nameHTML);
}

async function writeHTMLReport(content, name) {
  writeFile(`${reportPath}/${name}.html`, content, (error) => {
    if (error) {
      console.log("An error has occurred ", error);
      return;
    }
    console.log("Data written successfully to disk");
  });
}

async function reduceTestNames(arr) {
  let reduced = [...new Set(arr)];
  return reduced;
}

async function readFile(filePath) {
  try {
    const data = await fs.readFile(`${directoryPath}/${filePath}`, "utf8");
    return data;
  } catch (error) {
    console.error(`Got an error trying to read the file: ${error.message}`);
    return;
  }
}

async function parseFile(data) {
  const promise = await new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({ explicitArray: false });

    parser.parseString(data, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
  return promise;
}

async function readFiles() {
  const files = await fs.readdir(directoryPath, "utf8");
  return files;
}

(async function executeAll() {
  const data = await readFiles();

  let fileContent;
  const allFileContent = [];

  for (const file of data) {
    fileContent = await readFile(file);
    allFileContent.push(fileContent);
  }

  let parsedFile;
  const allParsedFiles = [];
  for (const fileContent of allFileContent) {
    parsedFile = await parseFile(fileContent);
    allParsedFiles.push(parsedFile);
  }

  let response = await testCaseResults(allParsedFiles);

  response.sort(function (a, b) {
    if (parseFloat(b.flakeScore) === parseFloat(a.flakeScore)) {
      return parseFloat(b.duration) - parseFloat(a.duration);
    } else {
      return parseFloat(b.flakeScore) > parseFloat(a.flakeScore) ? 1 : -1;
    }
  });

  await writeJSONReport(response, "diagnostics");
  await createHTML(response, "diagnostics");
})();
