# pamapamscrapping

Small scrapper for Pam a Pam project

## Set up

This is a nodejs project, just use your favorite package manager to install and run the script to generate the output. 

```
$ yarn install
```


## Run

A `.cache` folder will be created to store the intermediate assets and you can use the flag `-f` to ensure they are refreshed.

```
$ yarn start --help
yarn run v1.21.1
$ ts-node src/index.ts --help
Options:
  --help       Show help                                               [boolean]
  --version    Show version number                                     [boolean]
  -f, --force  Force to download the assets                            [boolean]
Done in 1.48s.
```

**Note**: If you set up the environment variable `DEBUG=pamapam` you will get further details on the process being executed.

## TO DO

Finalize the exporting process:

- [ ] Reorganize a bit the script to separate TypeScript types and a main function outside the initial command line interface script
- [ ] Expose a simple web interface to generate and download the CSV
- [ ] Try to deploy the script to a PaaS like `now` or `heroku`
