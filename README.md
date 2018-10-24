# Rating System API

## Introduction
This API Generates point to point quotes for inland cargo shipments using user defined data on carrier/customer contracts.
This API also provides a validated C.R.U.D. (Create, Read, Update, Delete) interface for maintaining the database of contract-based Lane information.
It can also provide formatted lists of all active customers and their contact information as well as lists of active customers that support LTL. 

---

# GITHUB Users!
The below documentation was intended for internal use. If you wish to see the same documentation this refers to, clone this repository, install all dependencies, and use the command 'npm run doc'. You will then have the js-doc static page under the directory ./docs. 
Also Please note that key portions of the configuration file for this application has been removed. If you attempt to run this application it will FAIL! This code is simply here as a demonstration for those interested in detailed documentation using JSDOC and how to implement a REST API in the real world. 

# Copyright
This code has been released for public display in agreement with Bo Brown Presedent of Rogers and Brown Customs Brokers. Contact bo_brown@rogers-brown.com for more information.

# Using This Interactive Documentation

In the navbar up above there is a search bar, a dropdown list for modules, global, classes, externals, and the name of this application. Each are explained in summary below.

#### Search Bar
This will search the documentation and source code of the entire application displaying a list of possibly relevant locations to choose from, based on the text you provide.
For Example, searching for 'insert' will show you every place in the documentation and source code where that word is mentioned.

#### Modules
This Application is broken down into individual modules designed to perform a given task, ranging from communication, processing, to managing other modules. This dropdown list shows you all of the modules within this application, their relative location, and each item in the dropdown is a link to that module's documentation.

#### Classes
These are used to create instances of an object that will need both properties and its own methods. This allows for the rapid creation of as many of these objects as necessary and ensures that each one will have the same behavior and capabilities as the next. An Example of this would be a Class that describes a single lane. This object would have properties for the origin, destination, rating information, etc... It would also have the ability to take those properties and translate their contents into a SQL string, or into XML format, etc... In Summary, a Class is a blueprint that is used to describe a 'Thing' (either physical or conceptual), that 'Thing's properties that are important, and what that 'Thing' can do that is important. 

#### Global
This is the documentation for anything unique to this application that exists on a 'Global' scale i.e. is available everywhere in the application, Currently this is only Type Definitions. These are documentation for custom objects that are used by more than one module. They can be thought of as Data Structures or Objects that don't have any instanced methods, unlike Classes. A Type Definition describes the contents of an object, what properties are expected and which ones are optional. This is normally only used for large objects that are passed between functions as a parameter, otherwise the contents are described in that function's documentation.

#### Externals
This shows a list of all external modules, these are packaged tools written by someone else for open source and/or free commercial use. The detailed description contains a brief summary of what that module is used for in this application. The description will also contain a link under the bulletin 'See:' that will take you to that module's NPM (Node Package Manager) page. 

---

# Getting Started

### Starting up the dev server
From the root directory of this app call "npm start" -- the server will print to console when it is listening and on what port. (default dev port is 8787, this can be changed under "SYSTEM.PORT" in config/default.json)


**NOTE:** Executing the "npm run deploy" command will start this inproduction under **_your_** profile. Only you will be able to see it from the shell terminal if the server is running by following the link above, or executing the command "forever list".

---

## Development Dependencies (Not listed in Externals)
The Rating System has the following dependencies for a development environment. These are not necessary to run the application, but are required to **build** the application.
**WARNING**: These must be installed to not only run the development environment but to also push changes to the production environment.
* [@babel/cli:](https://www.npmjs.com/package/@babel/cli) 7.0.0-beta.54 - command line tool for transpiling ES2015/2016/2017 code into CommonJS code.
* [@babel/core:](https://www.npmjs.com/package/@babel/core) 7.0.0-beta.54 - core libraries used by @babel/cli
* [@babel/node:](https://www.npmjs.com/package/@babel/node) ^7.0.0-rc.1 - command line tool used to actively run files through transpilation into runtime (used for testing without having to make an entire test directory)
* [@babel/preset-env:](https://www.npmjs.com/package/@babel/preset-env) 7.0.0-beta.54 - preset instructions babel uses to transpile ES2015/2016/2017 code into CommonJS code.
* [@babel/register:](https://www.npmjs.com/package/@babel/register) ^7.0.0-rc.1 - used to register a runtime to be used by @babel/node
* [babel-plugin-dynamic-import-node:](https://www.npmjs.com/package/babel-plugin-dynamic-import-node) ^2.0.0 - allows for dynamic/programmatic loading of modules.
* [ink-docstrap:](https://www.npmjs.com/package/ink-docstrap) ^1.3.2 - Set of styles used to create this documentation
* [jsdoc:](https://www.npmjs.com/package/jsdoc) ^3.5.5 - command line tool used to create this documentation
* [regenerator-runtime:](https://www.npmjs.com/package/regenerator-runtime) ^0.11.1 - library needed by @babel/register
* [rimraf:](https://www.npmjs.com/package/rimraf) ^2.6.2 - Tool used to natively remove a directory and all of its contents regardless of the type of operating system the Rating System is on. (Currently only used to clean out the dist/ folder before each build.)
