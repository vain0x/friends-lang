using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using FLC = FriendsLang.Compiler;
using FLE = FriendsLang.Compiler.Evaluating;
using FLP = FriendsLang.Compiler.Parsing.Parsing;

namespace FriendsLang.WebTrial.Controllers
{
    [Route("api/[controller]")]
    public class SampleDataController : Controller
    {
        private static string[] Summaries = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        [HttpPost("[action]")]
        public IActionResult Parse()
        {
            var blankLineRegex = new Regex("(\\r\\n|\\n){2}");

            var ruleScript = Request.Form["knowledge"];

            var ruleScripts =
             blankLineRegex
                .Split(ruleScript)
                .Select(str =>
                    str
                    .Replace("\r", " ")
                    .Replace("\n", " ")
                    .Trim()
                )
                .Where(str => !String.IsNullOrEmpty(str))
                .ToArray();

            var output = new StringBuilder();
            foreach (var script in ruleScripts)
            {
                output.AppendLine($"> {script}");

                var result = FLP.parseStatement(script);
                if (result.IsError)
                {
                    output.AppendLine(result.ErrorValue);
                    continue;
                }

                output.AppendLine();
            }

            return new ContentResult()
            {
                Content = output.ToString(),
                ContentType = "text",
                StatusCode = 200,
            };
        }

        [HttpGet("[action]")]
        public IEnumerable<WeatherForecast> WeatherForecasts()
        {
            var rng = new Random();
            return Enumerable.Range(1, 5).Select(index => new WeatherForecast
            {
                DateFormatted = DateTime.Now.AddDays(index).ToString("d"),
                TemperatureC = rng.Next(-20, 55),
                Summary = Summaries[rng.Next(Summaries.Length)]
            });
        }

        public class WeatherForecast
        {
            public string DateFormatted { get; set; }
            public int TemperatureC { get; set; }
            public string Summary { get; set; }

            public int TemperatureF
            {
                get
                {
                    return 32 + (int)(TemperatureC / 0.5556);
                }
            }
        }
    }
}
