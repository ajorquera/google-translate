const program = require('commander');
const package = require('./package');

// Require logic.js file and extract controller functions using JS destructuring assignment
const { addContact, getContact } = require('./logic');

program
  .version(package.versiom)
  .description(package.description)
  .usage('translate-json [options] <file ...>');

program
  .option('-l, --language', 'Select languages to translate', logic.addLanguage)

program.on('--help', function(){
  console.log('')
  console.log('Examples:');
  console.log('');
  console.log('  $ custom-help --help');
  console.log('  $ custom-help -h');
});

program
  .command('getContact <name>')
  .alias('r')
  .description('Get contact')
  .action(name => getContact(name));

program.parse(process.argv);