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

        private static string[] SplitIntoParagraphs(string input)
        {
            var blankLineRegex = new Regex("(\\r\\n|\\n){2}");
            return
                blankLineRegex
                .Split(input)
                .Select(str =>
                    str
                    .Replace("\r", " ")
                    .Replace("\n", " ")
                    .Trim()
                )
                .Where(str => !String.IsNullOrEmpty(str))
                .ToArray();
        }

        private static string Parse(string script)
        {
            var paragraphs = SplitIntoParagraphs(script);

            var output = new StringBuilder();
            foreach (var paragraph in paragraphs)
            {
                output.AppendLine($"> {paragraph}");

                var result = FLP.parseStatement(paragraph);
                if (result.IsError)
                {
                    output.AppendLine(result.ErrorValue);
                    continue;
                }

                output.AppendLine();
            }

            return output.ToString();
        }

        [HttpPost("[action]")]
        public IActionResult Parse()
        {
            var ruleScript = Request.Form["knowledge"];

            var output = Parse(ruleScript);

            return new ContentResult()
            {
                Content = output,
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
