# Automation Health Check

### What is it?

The Automation Health Check takes a history of XUnit test reports and runs diagnostics against them. Taking each test execution instance, an average duration, pass/failure rate and flake score is output to HTML and JSON files.

Each test is marked as either "Healthy" or "Unhealthy" based on the criteria of time to execute and past failures. Any degree of flake will flag test as unhealthy.

### What is considered flake?

A flaky test is a test that has fluctuated between a pass and fail state at any given time in its history. The more fluctuation that has occured, the higher the flake score will be.


## Setup instructions

    git clone https://github.com/redbadger/automation-health-check.git

    npm install

    The app is currently set up to run against the provided sample files, output from a basic Cypress test suite with flake deliberately introduced.

    Run: node app.js in the command line

    An html and JSON file will be output to the root of the project, titled "diagnostics"

    Open the html file in a browser to view the results

## To run the app against real files

    Run your automation suite with a JUnit test report output configured. For example, for Cypress, follow these instructions: https://github.com/michaelleeallen/mocha-junit-reporter

    Run the test suite enough times to produce a decent amount of test history (the more the better)

    Copy and paste the XML files across to the "files" directory in this repository

    Amend the "directoryPath" in "index.js" from "sampleFiles" to "files"

    Run: node app.js in the command line
    
    
## Output

<img width="1188" alt="Screenshot 2022-10-21 at 11 11 42" src="https://user-images.githubusercontent.com/20296527/197172323-15a190ba-3f34-4981-9559-88533c0a7979.png">
